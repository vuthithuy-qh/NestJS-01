// ===== CẤU HÌNH API =====
const API_BASE = "http://localhost:3000";

/**
 * Helper gọi GHN thông qua backend proxy (KHÔNG lộ token/key ra frontend)
 * Backend: GET /ghn/provinces, GET /ghn/districts?province_id=, GET /ghn/wards?district_id=
 *          POST /ghn/services, POST /ghn/fee
 */
async function ghnFetch(endpoint, method = "GET", body = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}/ghn${endpoint}`, options);
  const json = await res.json();

  // Backend ResponseInterceptor wraps: { statusCode, message, data }
  if (!res.ok) throw new Error(json.message || "GHN API error");
  return json.data != null ? json.data : json;
}

// ===== AUTH HELPERS =====
function getToken() {
  return localStorage.getItem("accessToken");
}

function isLoggedIn() {
  return !!getToken();
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.location.href = "../../auth/html/login.html";
}

// Redirect đến login kèm returnUrl (để quay lại trang hiện tại sau login)
function redirectToLogin() {
  const currentPath = window.location.href;
  window.location.href = `../../auth/html/login.html?returnUrl=${encodeURIComponent(currentPath)}`;
}

async function fetchWithAuth(url, options = {}) {
  const token = getToken();
  options.headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, options);
  // Tự động redirect nếu hết hạn token
  if (res.status === 401) {
    logout();
  }
  return res;
}

// ===== FORMAT HELPERS =====
function formatPrice(price) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function getCatImageUrl(image) {
  if (!image) return "../../../shared/assets/images/no-image.png";
  if (image.startsWith("http")) return image;
  return `${API_BASE}/${image}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

// ===== LOAD SHARED COMPONENTS =====
async function loadSharedComponents() {
  // Load Header
  const headerEl = document.getElementById("header-placeholder");
  if (headerEl) {
    const res = await fetch("../../../shared/components/header.html");
    headerEl.innerHTML = await res.text();
    initHeaderEvents();
    loadCartBadge();
    loadNotifBadge();
  }

  // Load Footer
  const footerEl = document.getElementById("footer-placeholder");
  if (footerEl) {
    const res = await fetch("../../../shared/components/footer.html");
    footerEl.innerHTML = await res.text();
  }
}

// ===== HEADER EVENTS =====
function initHeaderEvents() {
  // Account button
  const accountBtn = document.getElementById("accountBtn");
  const accountLabel = document.getElementById("accountLabel");
  if (accountBtn && accountLabel) {
    if (isLoggedIn()) {
      const user = getUser();
      accountLabel.textContent = user?.fullName || "Tài khoản";
      accountBtn.href = "#";

      // Show mini avatar if available
      const navIcon = accountBtn.querySelector('.nav-icon');
      if (user?.avatar && navIcon) {
        navIcon.innerHTML = `<img src="${user.avatar}" alt="" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">`;
      }

      // Tạo dropdown menu cho user đã đăng nhập
      accountBtn.style.position = "relative";
      const dropdown = document.createElement("div");
      dropdown.className = "account-dropdown";
      dropdown.style.display = "none";
      dropdown.innerHTML = `
        <a href="../../account/html/account.html" class="dropdown-item">👤 Tài khoản</a>
        <a href="../../orders/html/orders.html" class="dropdown-item">📦 Đơn hàng</a>
        <a href="#" class="dropdown-item dropdown-logout" id="logoutBtn">🚪 Đăng xuất</a>
      `;
      accountBtn.appendChild(dropdown);

      accountBtn.addEventListener("click", (e) => {
        // Chỉ toggle dropdown khi click vào accountBtn, không chặn click trên dropdown items
        if (e.target.closest('.dropdown-item')) return; // Cho phép navigate bình thường
        e.preventDefault();
        dropdown.style.display =
          dropdown.style.display === "none" ? "block" : "none";
      });

      // Đóng dropdown khi click ra ngoài
      document.addEventListener("click", (e) => {
        if (!accountBtn.contains(e.target)) {
          dropdown.style.display = "none";
        }
      });

      // Logout
      dropdown.querySelector("#logoutBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
      });
    } else {
      accountLabel.textContent = "Đăng nhập";
      accountBtn.addEventListener("click", (e) => {
        e.preventDefault();
        redirectToLogin();
      });
    }
  }

  // Cart button
  const cartBtn = document.getElementById("cartBtn");
  if (cartBtn) {
    cartBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!isLoggedIn()) {
        alert("Vui lòng đăng nhập để xem giỏ hàng!");
        redirectToLogin();
      } else {
        window.location.href = "../../cart/html/cart.html";
      }
    });
  }
}

// ===== CART BADGE =====
function updateCartBadge(cartData) {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;
  let count = 0;
  if (cartData && cartData.totalItems != null) {
    count = cartData.totalItems;
  } else if (cartData && cartData.items) {
    count = cartData.items.length;
  }
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : count;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

async function loadCartBadge() {
  if (!isLoggedIn()) return;
  try {
    const res = await fetchWithAuth(`${API_BASE}/shopping-cart`);
    if (res.ok) {
      const result = await res.json();
      updateCartBadge(result.data || result);
    }
  } catch (e) {
    // silent
  }
}

// ===== NOTIFICATION BADGE =====
async function loadNotifBadge() {
  if (!isLoggedIn()) return;

  // Init bell click
  const notifBtn = document.getElementById("notifBtn");
  if (notifBtn) {
    notifBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "../../account/html/account.html#notifications";
    });
  }

  try {
    const res = await fetchWithAuth(`${API_BASE}/notifications/unread-count`);
    if (!res.ok) return;
    const result = await res.json();
    const data = result.data || result;
    const count = data.unreadCount || 0;

    // Create or update badge on bell icon
    const notifBtnEl = document.getElementById("notifBtn");
    if (!notifBtnEl) return;

    let badge = notifBtnEl.querySelector(".notif-badge-header");
    if (count > 0) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "notif-badge-header";
        badge.style.cssText = "position:absolute;top:-4px;right:-8px;background:var(--danger);color:#fff;font-size:11px;padding:1px 6px;border-radius:10px;font-weight:700;";
        notifBtnEl.appendChild(badge);
      }
      badge.textContent = count > 99 ? "99+" : count;
    } else if (badge) {
      badge.remove();
    }
  } catch (e) {
    // silent
  }
}

// ===== TOAST NOTIFICATION =====
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}</span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== PROMOTION / DISCOUNT HELPERS =====
// Cache promotions theo categoryId để tránh gọi API nhiều lần
const _promotionCache = {};

async function getActivePromotions(categoryId) {
  if (!categoryId) return [];
  if (_promotionCache[categoryId]) return _promotionCache[categoryId];

  try {
    const res = await fetch(`${API_BASE}/promotions/category/${categoryId}`);
    const result = await res.json();
    const promotions = result.data || result;
    _promotionCache[categoryId] = Array.isArray(promotions) ? promotions : [];
    return _promotionCache[categoryId];
  } catch (err) {
    console.error("Lỗi tải khuyến mãi:", err);
    return [];
  }
}

// Lấy promotion tốt nhất (giảm nhiều nhất) cho 1 mức giá
function getBestPromotion(promotions, price) {
  if (!promotions || promotions.length === 0) return null;

  let bestPromo = null;
  let maxDiscount = 0;

  promotions.forEach((promo) => {
    let discount = 0;
    if (promo.discountType === "percentage") {
      discount = (price * promo.discountRate) / 100;
    } else if (promo.discountType === "fixed") {
      discount = Math.min(promo.discountAmount, price);
    }
    if (discount > maxDiscount) {
      maxDiscount = discount;
      bestPromo = promo;
    }
  });

  return bestPromo;
}

// Tính giá sau giảm
function calcDiscountedPrice(price, promotion) {
  if (!promotion) return price;
  if (promotion.discountType === "percentage") {
    return Math.max(0, price - (price * promotion.discountRate) / 100);
  } else {
    return Math.max(0, price - Math.min(promotion.discountAmount, price));
  }
}

// Render HTML hiển thị giá (có hoặc không có giảm giá)
function renderPriceHtml(price, promotion) {
  if (!promotion) {
    return `<span class="price-current">${formatPrice(price)}</span>`;
  }

  const discountedPrice = calcDiscountedPrice(price, promotion);
  const discountLabel =
    promotion.discountType === "percentage"
      ? `-${promotion.discountRate}%`
      : `-${formatPrice(promotion.discountAmount)}`;

  return `
    <span class="price-discount-badge">${discountLabel}</span>
    <span class="price-original">${formatPrice(price)}</span>
    <span class="price-current price-sale">${formatPrice(discountedPrice)}</span>
  `;
}

// Render HTML giá cho khoảng giá (min-max)
function renderPriceRangeHtml(minPrice, maxPrice, promotion) {
  if (!promotion) {
    if (minPrice === maxPrice) {
      return `<span class="price-current">${formatPrice(minPrice)}</span>`;
    }
    return `<span class="price-current">${formatPrice(minPrice)} - ${formatPrice(maxPrice)}</span>`;
  }

  const discountedMin = calcDiscountedPrice(minPrice, promotion);
  const discountedMax = calcDiscountedPrice(maxPrice, promotion);
  const discountLabel =
    promotion.discountType === "percentage"
      ? `-${promotion.discountRate}%`
      : `-${formatPrice(promotion.discountAmount)}`;

  const originalRange =
    minPrice === maxPrice
      ? formatPrice(minPrice)
      : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;

  const saleRange =
    discountedMin === discountedMax
      ? formatPrice(discountedMin)
      : `${formatPrice(discountedMin)} - ${formatPrice(discountedMax)}`;

  return `
    <span class="price-discount-badge">${discountLabel}</span>
    <span class="price-original">${originalRange}</span>
    <span class="price-current price-sale">${saleRange}</span>
  `;
}
