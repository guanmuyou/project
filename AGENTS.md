# AGENTS.md

## 项目概览

这是一个餐厅官网与订位管理小项目，项目名为 `qinghe-restaurant-home`。前端展示餐厅首页、招牌菜单和订位表单；后端提供订位提交、后台登录、订位列表读取等接口。

整体技术栈：

- 前端：Vue 3 + Vite
- 后端：Express 5
- 数据库：MySQL，通过 `mysql2/promise` 访问
- 环境变量：`dotenv`
- 构建产物目录：`dist/`

## 主要目录与文件

- `src/main.js`：Vue 应用入口，挂载 `App.vue` 并引入全局样式。
- `src/App.vue`：核心单文件组件，同时包含普通首页和 `/admin` 后台页面逻辑。
- `src/styles.css`：全局样式，包含首页、订位表单和后台管理界面样式。
- `src/assets/restaurant-hero.png`：首页首屏背景图。
- `server.js`：Express 服务端，负责 API、MySQL 表初始化、静态资源托管和前端路由回退。
- `vite.config.js`：Vite 配置，启用 Vue 插件，并把开发环境 `/api` 代理到 `http://localhost:3000`。
- `index.html`：Vite HTML 入口，语言为 `zh-CN`，引入 Google Fonts。
- `.env.example`：环境变量示例。
- `dist/`：生产构建输出目录，已被 `.gitignore` 忽略。
- `node_modules/`：本地依赖目录，已被 `.gitignore` 忽略。
- `PortableGit*/`、`PortableGit-*.exe`：本地临时 Git 工具，已被 `.gitignore` 忽略。

## 运行与构建

常用命令：

```bash
npm install
npm run dev
npm run build
npm run server
npm start
npm run preview
```

在当前 Windows/PowerShell 环境里，直接执行 `npm run build` 可能会被执行策略阻止。可以改用：

```powershell
npm.cmd run build
```

已验证：`npm.cmd run build` 可以成功构建项目。

开发模式建议：

- 前端开发服务器：`npm.cmd run dev`
- 后端 API 服务：`npm.cmd run server`
- Vite 开发服务器会通过 `vite.config.js` 把 `/api` 请求代理到后端 `3000` 端口。

生产模式：

- `npm start` 会先执行 `prestart` 中的 `npm run build`，再启动 `server.js`。
- `server.js` 会托管 `dist/` 静态文件，并对非 API 路由返回 `dist/index.html`。

## 环境变量

参考 `.env.example`：

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=qinghe_restaurant
ADMIN_PASSWORD=change-me
PORT=3000
```

说明：

- `MYSQL_*` 控制 MySQL 连接。
- `MYSQL_DATABASE` 默认是 `qinghe_restaurant`。
- `ADMIN_PASSWORD` 是 `/admin` 后台登录密码，未配置时后台登录接口会返回错误。
- `PORT` 控制 Express 服务端口，默认 `3000`。

注意：`.env` 和 `.env.*` 默认被忽略，只有 `.env.example` 会进入版本控制。

## 前端行为

`src/App.vue` 根据 `window.location.pathname === "/admin"` 判断当前页面：

- 普通路径：展示餐厅首页。
- `/admin`：展示后台订位管理页面。

首页包含：

- 固定顶部导航，滚动超过一定距离后切换样式。
- 首屏图片背景、品牌信息和行动按钮。
- 餐厅理念区域。
- 招牌菜单卡片。
- 订位表单。
- 页脚。

订位表单字段：

- `date`：日期，前端使用 `type="date"`。
- `guests`：用餐人数，前端下拉选项。
- `phone`：手机号或联系电话。

表单提交到：

```http
POST /api/bookings
```

后台页面包含：

- 后台密码登录。
- 登录后读取最近订位记录。
- 刷新订位列表。
- 退出登录。

后台相关接口：

```http
POST /api/admin/login
POST /api/admin/logout
GET /api/admin/bookings
```

## 后端行为

`server.js` 使用 Express 和 MySQL。

启动时会调用 `ensureBookingsTable()`，自动创建 `bookings` 表：

- `id`：自增主键
- `booking_date`：订位日期
- `guests`：人数文本
- `phone`：联系电话
- `status`：状态，默认 `new`
- `created_at`：创建时间
- `updated_at`：更新时间

接口摘要：

- `POST /api/bookings`
  - 校验日期格式是否为 `YYYY-MM-DD`。
  - 校验人数不能为空。
  - 校验电话长度在 6 到 32 之间。
  - 写入 `bookings` 表。

- `POST /api/admin/login`
  - 校验请求体里的 `password` 是否等于 `ADMIN_PASSWORD`。
  - 登录成功后生成随机 token，保存在内存 `Map` 中。
  - 通过 `admin_session` HttpOnly Cookie 保存登录状态。

- `POST /api/admin/logout`
  - 删除当前 token。
  - 清空 `admin_session` Cookie。

- `GET /api/admin/bookings`
  - 需要有效 `admin_session`。
  - 返回最近 200 条订位记录，按提交时间倒序排列。

## 数据与会话注意事项

- 后台会话存在内存 `sessions` Map 中，服务重启后登录状态会丢失。
- Cookie 设置为 `HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`。
- 当前没有持久化管理员账号体系，只有单个环境变量密码。
- 当前没有 CSRF、防暴力破解、限流或验证码等安全机制；如果部署到公网，建议补齐。
- `ensureBookingsTable()` 只创建表，不负责创建数据库本身；数据库需要提前存在。

## 编码与中文内容

项目面向中文餐厅官网，源码和页面包含大量中文文案。

在当前 PowerShell 终端中，`Get-Content` 输出中文时可能显示为乱码，但 `npm.cmd run build` 已能成功构建，说明 Vite 能正常读取源码。后续查看中文内容时，优先使用支持 UTF-8 的编辑器，避免把显示乱码误判为语法错误。

已有一个未跟踪文件 `src/AGENTS.md`，内容在当前终端显示为乱码。它不是标准根目录代理说明文件，处理前应先确认是否为用户临时记录，避免误删或误改。

## 协作约定

- 优先保持当前项目的小体量结构，不要轻易引入路由、状态管理或复杂组件拆分。
- 修改前端文案时注意中文编码，保存为 UTF-8。
- 修改 API 行为时同步检查 `src/App.vue` 中的 fetch 调用和错误提示。
- 修改数据库字段时同步更新 `ensureBookingsTable()`、写入 SQL、查询 SQL 和后台表格展示。
- 不要提交 `dist/`、`node_modules/`、`.env`、`.agents/`、`.codex/` 或 `PortableGit*`。
- 在 PowerShell 中运行 npm 脚本时，优先使用 `npm.cmd ...`。

## 已知验证

最近一次验证命令：

```powershell
npm.cmd run build
```

结果：构建成功，生成 `dist/index.html`、CSS、JS 和图片资源。
