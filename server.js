import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import mysql from "mysql2/promise";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);
const adminPassword = process.env.ADMIN_PASSWORD;
const sessions = new Map();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "qinghe_restaurant",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

app.use(express.json());

const sendError = (res, status, message) => {
  res.status(status).json({ error: message });
};

const parseCookies = (header = "") =>
  Object.fromEntries(
    header
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)])
  );

const getSessionToken = (req) => parseCookies(req.headers.cookie).admin_session;

const requireAdmin = (req, res, next) => {
  const token = getSessionToken(req);

  if (!token || !sessions.has(token)) {
    return sendError(res, 401, "请先登录后台");
  }

  next();
};

const ensureBookingsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      booking_date DATE NOT NULL,
      guests VARCHAR(20) NOT NULL,
      phone VARCHAR(32) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'new',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_bookings_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

app.post("/api/bookings", async (req, res) => {
  const { date, guests, phone } = req.body || {};
  const normalizedPhone = String(phone || "").trim();
  const normalizedGuests = String(guests || "").trim();

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return sendError(res, 400, "请选择有效日期");
  }

  if (!normalizedGuests) {
    return sendError(res, 400, "请选择用餐人数");
  }

  if (!normalizedPhone || normalizedPhone.length < 6 || normalizedPhone.length > 32) {
    return sendError(res, 400, "请填写有效手机号");
  }

  try {
    const [result] = await pool.execute(
      "INSERT INTO bookings (booking_date, guests, phone) VALUES (:date, :guests, :phone)",
      { date, guests: normalizedGuests, phone: normalizedPhone }
    );

    res.status(201).json({ id: result.insertId, message: "预约已提交" });
  } catch (error) {
    console.error("Failed to create booking:", error);
    sendError(res, 500, "预约暂时无法提交，请稍后再试");
  }
});

app.post("/api/admin/login", (req, res) => {
  if (!adminPassword) {
    return sendError(res, 500, "后台密码尚未配置");
  }

  if (req.body?.password !== adminPassword) {
    return sendError(res, 401, "后台密码不正确");
  }

  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { createdAt: Date.now() });
  res.setHeader(
    "Set-Cookie",
    `admin_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`
  );
  res.json({ message: "登录成功" });
});

app.post("/api/admin/logout", (req, res) => {
  const token = getSessionToken(req);

  if (token) {
    sessions.delete(token);
  }

  res.setHeader("Set-Cookie", "admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  res.json({ message: "已退出" });
});

app.get("/api/admin/bookings", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        DATE_FORMAT(booking_date, '%Y-%m-%d') AS date,
        guests,
        phone,
        status,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
      FROM bookings
      ORDER BY created_at DESC
      LIMIT 200
    `);

    res.json({ bookings: rows });
  } catch (error) {
    console.error("Failed to list bookings:", error);
    sendError(res, 500, "预约列表暂时无法读取");
  }
});

app.use(express.static(path.join(__dirname, "dist")));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const start = async () => {
  await ensureBookingsTable();
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
};

start().catch((error) => {
  if (error?.code === "ER_ACCESS_DENIED_ERROR") {
    console.error(
      [
        "Failed to start server: MySQL login failed.",
        "Please check MYSQL_USER and MYSQL_PASSWORD in .env, or create a MySQL user that can access MYSQL_DATABASE.",
        `Current target: ${process.env.MYSQL_USER || "root"}@${process.env.MYSQL_HOST || "127.0.0.1"}:${process.env.MYSQL_PORT || 3306}`,
      ].join("\n")
    );
  } else {
    console.error("Failed to start server:", error);
  }
  process.exit(1);
});
