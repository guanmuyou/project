<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import heroImage from "./assets/restaurant-hero.png";

const isAdminPage = window.location.pathname === "/admin";

const navItems = [
  { label: "菜单", href: "#menu" },
  { label: "理念", href: "#story" },
  { label: "订位", href: "#booking" },
];

const dishes = [
  {
    tag: "前菜",
    name: "烟熏番茄布拉塔",
    description: "慢烤番茄、罗勒油、海盐脆片和水牛乳酪。",
    price: "¥68",
  },
  {
    tag: "主菜",
    name: "黑蒜牛排配根芹泥",
    description: "谷饲牛排、黑蒜汁、根芹泥与焦化洋葱。",
    price: "¥188",
  },
  {
    tag: "海鲜",
    name: "柚香煎鳕鱼",
    description: "低温鳕鱼、柚子白酱、芦笋和香草面包糠。",
    price: "¥158",
  },
  {
    tag: "甜点",
    name: "桂花焦糖布丁",
    description: "法式布丁、桂花糖浆、烤杏仁与一点海盐。",
    price: "¥46",
  },
];

const details = [
  { label: "营业时间", value: "周二至周日 17:30 - 22:30" },
  { label: "地址", value: "梧桐路 26 号 1 层" },
  { label: "电话", value: "021-7788-2046" },
];

const guestOptions = [
  { value: "2", label: "2 位" },
  { value: "3", label: "3 位" },
  { value: "4", label: "4 位" },
  { value: "6", label: "5-6 位" },
  { value: "8", label: "7 位以上" },
];

const isScrolled = ref(false);
const message = ref("");
const isSubmitting = ref(false);
const booking = reactive({
  date: "",
  guests: "2",
  phone: "",
});

const admin = reactive({
  password: "",
  isLoggedIn: false,
  isLoading: false,
  message: "",
  bookings: [],
});

const headerClass = computed(() => ({
  "is-scrolled": isScrolled.value,
}));

const syncHeader = () => {
  isScrolled.value = window.scrollY > 24;
};

const submitBooking = async () => {
  message.value = "";
  isSubmitting.value = true;

  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "预约暂时无法提交，请稍后再试");
    }

    message.value = "预约已提交，我们会尽快电话确认。";
    booking.date = "";
    booking.guests = "2";
    booking.phone = "";
  } catch (error) {
    message.value = error.message;
  } finally {
    isSubmitting.value = false;
  }
};

const loadAdminBookings = async () => {
  admin.isLoading = true;
  admin.message = "";

  try {
    const response = await fetch("/api/admin/bookings");
    const result = await response.json().catch(() => ({}));

    if (response.status === 401) {
      admin.isLoggedIn = false;
      admin.bookings = [];
      return;
    }

    if (!response.ok) {
      throw new Error(result.error || "预约列表暂时无法读取");
    }

    admin.isLoggedIn = true;
    admin.bookings = result.bookings || [];
  } catch (error) {
    admin.message = error.message;
  } finally {
    admin.isLoading = false;
  }
};

const loginAdmin = async () => {
  admin.isLoading = true;
  admin.message = "";

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: admin.password }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "登录失败");
    }

    admin.password = "";
    await loadAdminBookings();
  } catch (error) {
    admin.message = error.message;
  } finally {
    admin.isLoading = false;
  }
};

const logoutAdmin = async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  admin.isLoggedIn = false;
  admin.bookings = [];
};

onMounted(() => {
  if (isAdminPage) {
    loadAdminBookings();
    return;
  }

  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });
});

onBeforeUnmount(() => {
  if (!isAdminPage) {
    window.removeEventListener("scroll", syncHeader);
  }
});
</script>

<template>
  <main v-if="isAdminPage" class="admin-page">
    <section class="admin-shell">
      <div class="admin-heading">
        <div>
          <p class="section-kicker">Admin</p>
          <h1>预约管理</h1>
        </div>
        <button v-if="admin.isLoggedIn" class="admin-secondary" type="button" @click="logoutAdmin">
          退出
        </button>
      </div>

      <form v-if="!admin.isLoggedIn" class="admin-login" @submit.prevent="loginAdmin">
        <label>
          后台密码
          <input v-model="admin.password" type="password" autocomplete="current-password" required />
        </label>
        <button type="submit" :disabled="admin.isLoading">
          {{ admin.isLoading ? "登录中..." : "登录后台" }}
        </button>
        <p class="admin-message" role="status">{{ admin.message }}</p>
      </form>

      <section v-else class="admin-panel" aria-label="预约列表">
        <div class="admin-toolbar">
          <strong>最新预约</strong>
          <button class="admin-secondary" type="button" :disabled="admin.isLoading" @click="loadAdminBookings">
            刷新
          </button>
        </div>
        <p v-if="admin.message" class="admin-message" role="status">{{ admin.message }}</p>
        <div class="booking-table-wrap">
          <table class="booking-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>人数</th>
                <th>手机号</th>
                <th>状态</th>
                <th>提交时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!admin.bookings.length">
                <td colspan="5">暂无预约记录</td>
              </tr>
              <tr v-for="item in admin.bookings" :key="item.id">
                <td>{{ item.date }}</td>
                <td>{{ item.guests }}</td>
                <td>{{ item.phone }}</td>
                <td>{{ item.status }}</td>
                <td>{{ item.createdAt }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  </main>

  <template v-else>
    <header class="site-header" :class="headerClass" aria-label="主导航">
      <a class="brand" href="#top" aria-label="青禾小馆首页">
        <span class="brand-mark">青</span>
        <span>
          <strong>青禾小馆</strong>
          <small>Seasonal Table</small>
        </span>
      </a>
      <nav class="nav-links" aria-label="页面导航">
        <a v-for="item in navItems" :key="item.href" :href="item.href">{{ item.label }}</a>
      </nav>
      <a class="header-action" href="#booking">预约餐位</a>
    </header>

    <main id="top">
      <section class="hero" aria-label="青禾小馆首页首屏">
        <img class="hero-image" :src="heroImage" alt="温暖灯光下的现代餐厅餐桌与精致菜品" />
        <div class="hero-overlay" aria-hidden="true"></div>
        <div class="hero-content">
          <p class="eyebrow">当季食材 · 城市晚餐 · 手作酒单</p>
          <h1>把今晚，留给一桌刚刚好的热闹。</h1>
          <p class="hero-copy">
            青禾小馆用本地鲜蔬、炭火主菜和自制酱汁做一顿松弛却郑重的晚餐。
            适合两个人的慢聊，也适合一群人的庆祝。
          </p>
          <div class="hero-actions">
            <a class="button primary" href="#booking">立即订位</a>
            <a class="button secondary" href="#menu">查看菜单</a>
          </div>
        </div>
        <aside class="hero-note" aria-label="今日推荐">
          <span>今日主厨推荐</span>
          <strong>香草炭烤春鸡</strong>
          <small>搭配柠檬黄油汁与烤时蔬</small>
        </aside>
      </section>

      <section class="intro" id="story">
        <div>
          <p class="section-kicker">Our Table</p>
          <h2>新鲜、克制、有温度。</h2>
        </div>
        <p>
          我们每天根据市场供应调整部分菜单，让餐桌保留季节感。开放式厨房、低干预烹调和
          精准调味，是青禾小馆最稳定的三件事。
        </p>
      </section>

      <section class="menu-section" id="menu" aria-labelledby="menu-title">
        <div class="section-heading">
          <p class="section-kicker">Signature</p>
          <h2 id="menu-title">招牌菜单</h2>
        </div>
        <div class="menu-grid">
          <article v-for="dish in dishes" :key="dish.name" class="dish-card">
            <span class="dish-tag">{{ dish.tag }}</span>
            <h3>{{ dish.name }}</h3>
            <p>{{ dish.description }}</p>
            <strong>{{ dish.price }}</strong>
          </article>
        </div>
      </section>

      <section class="booking" id="booking" aria-labelledby="booking-title">
        <div class="booking-copy">
          <p class="section-kicker">Reserve</p>
          <h2 id="booking-title">订一张今晚的桌子</h2>
          <p>晚餐时段建议提前预约。我们会保留少量吧台席给临时到店的客人。</p>
          <ul class="details-list">
            <li v-for="detail in details" :key="detail.label">
              <span>{{ detail.label }}</span>
              <strong>{{ detail.value }}</strong>
            </li>
          </ul>
        </div>
        <form class="booking-form" aria-label="订位表单" @submit.prevent="submitBooking">
          <label>
            日期
            <input v-model="booking.date" type="date" name="date" required />
          </label>
          <label>
            人数
            <select v-model="booking.guests" name="guests" required>
              <option v-for="option in guestOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label>
            手机
            <input v-model="booking.phone" type="tel" name="phone" placeholder="用于确认订位" required />
          </label>
          <button type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? "提交中..." : "提交预约" }}
          </button>
          <p class="form-message" role="status" aria-live="polite">{{ message }}</p>
        </form>
      </section>
    </main>

    <footer class="site-footer">
      <span>青禾小馆</span>
      <span>Seasonal food, warm evenings.</span>
    </footer>
  </template>
</template>
