// ===== ACCOUNT PAGE =====

const statusLabels = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý",
  shipped: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã huỷ",
};

const notifIcons = {
  new_cat: "🐱",
  new_voucher: "🎉",
  order_update: "📦",
};

let orderPage = 1;
let orderStatus = "";
let notifPage = 1;
const ORDER_LIMIT = 10;
const NOTIF_LIMIT = 20;

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  await loadSharedComponents();

  if (!isLoggedIn()) {
    redirectToLogin();
    return;
  }

  initSidebarTabs();
  initOrderTabs();
  initAvatarUpload();
  initProfileForm();
  initPasswordForm();
  initReadAll();

  await loadProfile();
  await loadSidebarNotifBadge();

  // Hash-based tab switching (for #notifications link from header bell)
  handleHashTab();
});

// ===== SIDEBAR TAB SWITCHING =====
function initSidebarTabs() {
  document.querySelectorAll(".sidebar-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Update active sidebar button
      document.querySelector(".sidebar-btn.active").classList.remove("active");
      btn.classList.add("active");

      // Show corresponding tab
      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
      document.getElementById(`tab-${tab}`).classList.add("active");

      // Lazy load content
      if (tab === "orders") loadOrders();
      if (tab === "notifications") loadNotifications();
    });
  });
}

function handleHashTab() {
  const hash = window.location.hash.replace("#", "");
  if (hash) {
    const btn = document.querySelector(`.sidebar-btn[data-tab="${hash}"]`);
    if (btn) btn.click();
  }
}

// ===== PROFILE =====
async function loadProfile() {
  try {
    const res = await fetchWithAuth(`${API_BASE}/users/me`);
    if (!res.ok) throw new Error("Failed to load profile");

    const result = await res.json();
    const user = result.data || result;

    // Sidebar
    document.getElementById("sidebarName").textContent = user.fullName || "User";
    document.getElementById("sidebarEmail").textContent = user.email || "";

    if (user.avatar) {
      document.getElementById("avatarImg").src = user.avatar;
    }

    // Update localStorage user
    const storedUser = getUser() || {};
    storedUser.fullName = user.fullName;
    storedUser.avatar = user.avatar;
    localStorage.setItem("user", JSON.stringify(storedUser));

    // Form fields
    document.getElementById("inputFullName").value = user.fullName || "";
    document.getElementById("inputEmail").value = user.email || "";
    document.getElementById("inputPhone").value = user.phone || "";
  } catch (err) {
    console.error("Error loading profile:", err);
  }
}

// ===== AVATAR UPLOAD =====
function initAvatarUpload() {
  const wrapper = document.getElementById("avatarWrapper");
  const input = document.getElementById("avatarInput");

  wrapper.addEventListener("click", () => input.click());

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn file ảnh!", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("File ảnh không được vượt quá 5MB!", "error");
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById("avatarImg").src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Upload
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetchWithAuth(`${API_BASE}/users/me/avatar`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload thất bại");
      }

      const result = await res.json();
      const data = result.data || result;
      document.getElementById("avatarImg").src = data.avatar;

      // Update localStorage
      const storedUser = getUser() || {};
      storedUser.avatar = data.avatar;
      localStorage.setItem("user", JSON.stringify(storedUser));

      showToast("Cập nhật avatar thành công! 🎉");
    } catch (err) {
      showToast(err.message || "Lỗi upload avatar", "error");
    }

    input.value = "";
  });
}

// ===== PROFILE FORM =====
function initProfileForm() {
  document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = document.getElementById("inputFullName").value.trim();
    const email = document.getElementById("inputEmail").value.trim();
    const phone = document.getElementById("inputPhone").value.trim();

    try {
      const res = await fetchWithAuth(`${API_BASE}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Cập nhật thất bại");
      }

      // Update sidebar name
      document.getElementById("sidebarName").textContent = fullName;

      // Update localStorage
      const storedUser = getUser() || {};
      storedUser.fullName = fullName;
      localStorage.setItem("user", JSON.stringify(storedUser));

      showToast("Cập nhật thông tin thành công! ✅");
    } catch (err) {
      showToast(err.message || "Lỗi cập nhật", "error");
    }
  });
}

// ===== PASSWORD FORM =====
function initPasswordForm() {
  document.getElementById("passwordForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const password = document.getElementById("inputNewPassword").value;
    const confirm = document.getElementById("inputConfirmPassword").value;

    if (password !== confirm) {
      showToast("Mật khẩu xác nhận không khớp!", "error");
      return;
    }

    try {
      const res = await fetchWithAuth(`${API_BASE}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Đổi mật khẩu thất bại");
      }

      showToast("Đổi mật khẩu thành công! 🔒");
      document.getElementById("passwordForm").reset();
    } catch (err) {
      showToast(err.message || "Lỗi đổi mật khẩu", "error");
    }
  });
}

// ===== ORDERS =====
function initOrderTabs() {
  document.querySelectorAll("#orderTabs .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelector("#orderTabs .tab-btn.active").classList.remove("active");
      btn.classList.add("active");
      orderStatus = btn.dataset.status;
      orderPage = 1;
      loadOrders();
    });
  });
}

async function loadOrders() {
  const loading = document.getElementById("ordersLoading");
  const empty = document.getElementById("ordersEmpty");
  const list = document.getElementById("accountOrderList");
  const pag = document.getElementById("ordersPagination");

  loading.style.display = "flex";
  empty.style.display = "none";
  list.style.display = "none";
  pag.style.display = "none";

  try {
    let url = `${API_BASE}/orders/my-orders?page=${orderPage}&limit=${ORDER_LIMIT}`;
    if (orderStatus) url += `&status=${orderStatus}`;

    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error("Lỗi tải đơn hàng");
    const result = await res.json();

    let orders, total;
    const payload = result.data || result;
    if (payload.data && Array.isArray(payload.data)) {
      orders = payload.data;
      total = payload.total || orders.length;
    } else if (Array.isArray(payload)) {
      orders = payload;
      total = orders.length;
    } else {
      orders = [];
      total = 0;
    }

    loading.style.display = "none";

    if (orders.length === 0) {
      empty.style.display = "block";
      return;
    }

    list.style.display = "flex";
    renderOrders(orders);

    const totalPages = Math.ceil(total / ORDER_LIMIT);
    if (totalPages > 1) {
      pag.style.display = "flex";
      renderOrderPagination(totalPages);
    }
  } catch (err) {
    loading.style.display = "none";
    empty.style.display = "block";
    console.error("Error loading orders:", err);
  }
}

function renderOrders(orders) {
  const list = document.getElementById("accountOrderList");

  list.innerHTML = orders
    .map((order) => {
      const status = order.status?.status || order.status || "pending";
      const statusLabel = statusLabels[status] || status;
      const orderDate = formatDate(order.orderDate);
      const lines = order.orderLines || [];
      const displayLines = lines.slice(0, 2);
      const moreCount = lines.length - 2;

      return `
      <div class="order-card">
        <div class="order-card-header">
          <div>
            <span class="order-id">Đơn hàng #${order.id}</span>
            <span class="order-date"> • ${orderDate}</span>
          </div>
          <span class="order-status status-${status}">${statusLabel}</span>
        </div>
        <div class="order-items-preview">
          ${displayLines
            .map(
              (line) => `
            <div class="order-item-row">
              <img src="${getCatImageUrl(line.catSpec?.cat?.image || line.catSpec?.image)}"
                   alt="${line.catSpec?.cat?.name || ""}"
                   onerror="this.src='https://placehold.co/48x48/f0faf4/52b788?text=🐱'" />
              <div class="oi-info">
                <div class="oi-name">${line.catSpec?.cat?.name || "Sản phẩm"}</div>
                <div class="oi-sku">${line.catSpec?.sku || ""}</div>
              </div>
              <div class="oi-qty">x${line.qty}</div>
              <div class="oi-price">${formatPrice(line.price * line.qty)}</div>
            </div>
          `
            )
            .join("")}
          ${moreCount > 0 ? `<div class="more-items">... và ${moreCount} sản phẩm khác</div>` : ""}
        </div>
        <div class="order-card-footer">
          <div class="order-total">Tổng: <span>${formatPrice(Number(order.orderTotal))}</span></div>
          <div class="order-actions">
            <button class="btn-order btn-order-detail" onclick="viewOrderDetail(${order.id})">Xem chi tiết</button>
            ${status === "pending" || status === "confirmed" ? `<button class="btn-order btn-order-cancel" onclick="cancelOrder(${order.id})">Huỷ đơn</button>` : ""}
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderOrderPagination(totalPages) {
  const pag = document.getElementById("ordersPagination");
  let html = "";

  if (orderPage > 1) {
    html += `<button class="page-btn" onclick="goOrderPage(${orderPage - 1})">‹</button>`;
  }

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - orderPage) <= 2) {
      html += `<button class="page-btn ${i === orderPage ? "active" : ""}" onclick="goOrderPage(${i})">${i}</button>`;
    } else if (Math.abs(i - orderPage) === 3) {
      html += `<span class="page-btn" style="border:none;cursor:default">...</span>`;
    }
  }

  if (orderPage < totalPages) {
    html += `<button class="page-btn" onclick="goOrderPage(${orderPage + 1})">›</button>`;
  }

  pag.innerHTML = html;
}

function goOrderPage(page) {
  orderPage = page;
  loadOrders();
}

// ===== ORDER DETAIL MODAL =====
async function viewOrderDetail(orderId) {
  const modal = document.getElementById("orderDetailModal");
  const body = document.getElementById("orderDetailBody");
  modal.style.display = "flex";
  body.innerHTML = '<div class="spinner"></div>';

  try {
    const res = await fetchWithAuth(`${API_BASE}/orders/my-orders/${orderId}`);
    if (!res.ok) throw new Error("Không thể tải chi tiết");
    const result = await res.json();
    const order = result.data || result;
    renderOrderDetail(order);
  } catch (err) {
    body.innerHTML = `<p style="color:var(--danger);text-align:center">${err.message}</p>`;
  }
}

function renderOrderDetail(order) {
  const body = document.getElementById("orderDetailBody");
  const status = order.status?.status || order.status || "pending";
  const lines = order.orderLines || [];

  const steps = ["pending", "confirmed", "processing", "shipped", "delivered"];
  const currentIdx = steps.indexOf(status);
  const isCancelled = status === "cancelled";

  const timelineHtml = `
    <div class="status-timeline">
      ${steps
        .map((s, i) => {
          let cls = "";
          if (isCancelled) {
            if (i === 0) cls = "cancelled";
          } else if (i < currentIdx) {
            cls = "completed";
          } else if (i === currentIdx) {
            cls = "active";
          }
          return `
          <div class="timeline-step ${cls}">
            <div class="timeline-dot">${cls === "completed" ? "✓" : cls === "cancelled" ? "✕" : i + 1}</div>
            <div class="timeline-label">${statusLabels[s]}</div>
          </div>
        `;
        })
        .join("")}
    </div>
    ${isCancelled ? `<p style="color:var(--danger);text-align:center;margin-top:12px;font-weight:600">Đơn hàng đã bị huỷ</p>` : ""}
  `;

  const addr = order.address;
  const addrText = addr
    ? `${addr.address_line1 || addr.unit_number || ""}${addr.address_line2 ? ", " + addr.address_line2 : ""}${addr.city ? ", " + addr.city : ""}${addr.region ? ", " + addr.region : ""}`
    : "N/A";

  const shipping = order.shippingMethod;
  const shippingText = shipping
    ? `${shipping.name} (${formatPrice(Number(shipping.price))})`
    : "N/A";

  body.innerHTML = `
    <div class="detail-section">
      <h3>Trạng thái đơn hàng</h3>
      ${timelineHtml}
    </div>
    <div class="detail-section">
      <h3>Thông tin đơn hàng</h3>
      <div class="detail-row"><span class="label">Mã đơn hàng</span><span class="value">#${order.id}</span></div>
      <div class="detail-row"><span class="label">Ngày đặt</span><span class="value">${formatDate(order.orderDate)}</span></div>
      <div class="detail-row"><span class="label">Địa chỉ</span><span class="value">${addrText}</span></div>
      <div class="detail-row"><span class="label">Vận chuyển</span><span class="value">${shippingText}</span></div>
    </div>
    <div class="detail-section">
      <h3>Sản phẩm (${lines.length})</h3>
      <div class="detail-items">
        ${lines
          .map(
            (line) => `
          <div class="order-item-row">
            <img src="${getCatImageUrl(line.catSpec?.cat?.image || line.catSpec?.image)}"
                 alt="${line.catSpec?.cat?.name || ""}"
                 onerror="this.src='https://placehold.co/48x48/f0faf4/52b788?text=🐱'" />
            <div class="oi-info">
              <div class="oi-name">${line.catSpec?.cat?.name || "Sản phẩm"}</div>
              <div class="oi-sku">${line.catSpec?.sku || ""}</div>
            </div>
            <div class="oi-qty">x${line.qty}</div>
            <div class="oi-price">${formatPrice(line.price * line.qty)}</div>
          </div>
        `
          )
          .join("")}
      </div>
      <div class="detail-total-row" style="border-top:none;padding-top:4px;font-size:0.9rem;font-weight:500">
        <span>Tạm tính</span>
        <span>${formatPrice(lines.reduce((s, l) => s + l.price * l.qty, 0))}</span>
      </div>
      ${Number(order.shippingFee) > 0 ? `
      <div class="detail-total-row" style="border-top:none;padding-top:4px;font-size:0.9rem;font-weight:500">
        <span>Phí vận chuyển</span>
        <span>${formatPrice(Number(order.shippingFee))}</span>
      </div>` : ""}
      <div class="detail-total-row">
        <span>Tổng cộng</span>
        <span class="total-value">${formatPrice(Number(order.orderTotal))}</span>
      </div>
    </div>
    ${order.notes ? `<div class="detail-section"><h3>Ghi chú</h3><div class="detail-notes">${order.notes}</div></div>` : ""}
    ${status === "pending" || status === "confirmed" ? `<div style="text-align:center;margin-top:12px"><button class="btn-order btn-order-cancel" onclick="cancelOrder(${order.id})" style="padding:10px 32px;font-size:0.95rem">Huỷ đơn hàng</button></div>` : ""}
  `;
}

function closeOrderDetail() {
  document.getElementById("orderDetailModal").style.display = "none";
}

document.addEventListener("click", (e) => {
  if (e.target.id === "orderDetailModal") closeOrderDetail();
});

async function cancelOrder(orderId) {
  if (!confirm("Bạn có chắc muốn huỷ đơn hàng này?")) return;

  try {
    const res = await fetchWithAuth(
      `${API_BASE}/orders/my-orders/${orderId}/cancel`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Khách hàng huỷ đơn" }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Không thể huỷ đơn hàng");
    }

    showToast("Đã huỷ đơn hàng thành công");
    closeOrderDetail();
    await loadOrders();
  } catch (err) {
    showToast(err.message || "Lỗi huỷ đơn hàng", "error");
  }
}

// ===== NOTIFICATIONS =====
async function loadNotifBadge() {
  try {
    const res = await fetchWithAuth(`${API_BASE}/notifications/unread-count`);
    if (!res.ok) return;
    const result = await res.json();
    const data = result.data || result;
    const count = data.unreadCount || 0;

    const badge = document.getElementById("sidebarNotifBadge");
    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : count;
      badge.style.display = "inline";
    } else {
      badge.style.display = "none";
    }
  } catch (e) {
    // silent
  }
}

function initReadAll() {
  document.getElementById("btnReadAll").addEventListener("click", async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/notifications/read-all`, {
        method: "PATCH",
      });
      if (res.ok) {
        showToast("Đã đánh dấu tất cả đã đọc ✅");
        await loadNotifications();
        await loadNotifBadge();
      }
    } catch (e) {
      showToast("Lỗi", "error");
    }
  });
}

async function loadNotifications() {
  const loading = document.getElementById("notifLoading");
  const empty = document.getElementById("notifEmpty");
  const list = document.getElementById("notifList");
  const pag = document.getElementById("notifPagination");

  loading.style.display = "flex";
  empty.style.display = "none";
  list.style.display = "none";
  pag.style.display = "none";

  try {
    const res = await fetchWithAuth(`${API_BASE}/notifications?page=${notifPage}&limit=${NOTIF_LIMIT}`);
    if (!res.ok) throw new Error("Lỗi tải thông báo");
    const result = await res.json();

    let notifications, total;
    const payload = result.data || result;
    if (payload.data && Array.isArray(payload.data)) {
      notifications = payload.data;
      total = payload.total || notifications.length;
    } else if (Array.isArray(payload)) {
      notifications = payload;
      total = notifications.length;
    } else {
      notifications = [];
      total = 0;
    }

    loading.style.display = "none";

    if (notifications.length === 0) {
      empty.style.display = "block";
      return;
    }

    list.style.display = "flex";
    renderNotifications(notifications);

    const totalPages = Math.ceil(total / NOTIF_LIMIT);
    if (totalPages > 1) {
      pag.style.display = "flex";
      renderNotifPagination(totalPages);
    }
  } catch (err) {
    loading.style.display = "none";
    empty.style.display = "block";
    console.error("Error loading notifications:", err);
  }
}

function renderNotifications(notifications) {
  const list = document.getElementById("notifList");

  list.innerHTML = notifications
    .map((notif) => {
      const icon = notifIcons[notif.type] || "🔔";
      const timeAgo = getTimeAgo(notif.createdAt);
      const unreadClass = notif.isRead ? "" : "unread";

      return `
      <div class="notif-item ${unreadClass}" onclick="markNotifRead(${notif.id}, this)">
        <div class="notif-icon">${icon}</div>
        <div class="notif-body">
          <div class="notif-title">${notif.title}</div>
          <div class="notif-message">${notif.message}</div>
          <div class="notif-time">${timeAgo}</div>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderNotifPagination(totalPages) {
  const pag = document.getElementById("notifPagination");
  let html = "";

  if (notifPage > 1) {
    html += `<button class="page-btn" onclick="goNotifPage(${notifPage - 1})">‹</button>`;
  }

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - notifPage) <= 2) {
      html += `<button class="page-btn ${i === notifPage ? "active" : ""}" onclick="goNotifPage(${i})">${i}</button>`;
    } else if (Math.abs(i - notifPage) === 3) {
      html += `<span class="page-btn" style="border:none;cursor:default">...</span>`;
    }
  }

  if (notifPage < totalPages) {
    html += `<button class="page-btn" onclick="goNotifPage(${notifPage + 1})">›</button>`;
  }

  pag.innerHTML = html;
}

function goNotifPage(page) {
  notifPage = page;
  loadNotifications();
}

async function markNotifRead(notifId, element) {
  if (!element.classList.contains("unread")) return;

  try {
    await fetchWithAuth(`${API_BASE}/notifications/${notifId}/read`, {
      method: "PATCH",
    });
    element.classList.remove("unread");
    await loadNotifBadge();
  } catch (e) {
    // silent
  }
}

// ===== HELPERS =====
function getTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return formatDate(dateStr);
}
