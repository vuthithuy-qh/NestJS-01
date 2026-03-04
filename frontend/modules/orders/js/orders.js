// ===== ORDERS PAGE =====

let currentPage = 1;
let currentStatus = "";
const LIMIT = 10;

const statusLabels = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý",
  shipped: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã huỷ",
};

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  await loadSharedComponents();

  if (!isLoggedIn()) {
    redirectToLogin();
    return;
  }

  initTabs();
  await loadOrders();
});

// ===== TABS =====
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelector(".tab-btn.active").classList.remove("active");
      btn.classList.add("active");
      currentStatus = btn.dataset.status;
      currentPage = 1;
      loadOrders();
    });
  });
}

// ===== LOAD ORDERS =====
async function loadOrders() {
  const loadingEl = document.getElementById("loadingState");
  const emptyEl = document.getElementById("emptyState");
  const listEl = document.getElementById("orderList");
  const pagEl = document.getElementById("pagination");

  loadingEl.style.display = "block";
  emptyEl.style.display = "none";
  listEl.style.display = "none";
  pagEl.style.display = "none";

  try {
    let url = `${API_BASE}/orders/my-orders?page=${currentPage}&limit=${LIMIT}`;
    if (currentStatus) url += `&status=${currentStatus}`;

    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error("Lỗi tải đơn hàng");
    const result = await res.json();

    let orders, total;

    // Handle different response shapes
    // ResponseInterceptor wraps: { statusCode, message, data: { data: [...], total, totalPages } }
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

    loadingEl.style.display = "none";

    if (orders.length === 0) {
      emptyEl.style.display = "block";
      return;
    }

    listEl.style.display = "block";
    renderOrders(orders);

    const totalPages = Math.ceil(total / LIMIT);
    if (totalPages > 1) {
      pagEl.style.display = "flex";
      renderPagination(totalPages);
    }
  } catch (err) {
    loadingEl.style.display = "none";
    emptyEl.style.display = "block";
    console.error("Lỗi tải đơn hàng:", err);
  }
}

// ===== RENDER ORDERS =====
function renderOrders(orders) {
  const listEl = document.getElementById("orderList");

  listEl.innerHTML = orders
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
          `,
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

// ===== RENDER PAGINATION =====
function renderPagination(totalPages) {
  const pagEl = document.getElementById("pagination");
  let html = "";

  if (currentPage > 1) {
    html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})">‹</button>`;
  }

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
      html += `<button class="page-btn ${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">${i}</button>`;
    } else if (Math.abs(i - currentPage) === 3) {
      html += `<span class="page-btn" style="border:none;cursor:default">...</span>`;
    }
  }

  if (currentPage < totalPages) {
    html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})">›</button>`;
  }

  pagEl.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  loadOrders();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== VIEW ORDER DETAIL =====
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

  // Status timeline
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

  // Address
  const addr = order.address;
  const addrText = addr
    ? `${addr.address_line1 || addr.unit_number || ""}${addr.address_line2 ? ", " + addr.address_line2 : ""}${addr.city ? ", " + addr.city : ""}${addr.region ? ", " + addr.region : ""}`
    : "N/A";

  // Shipping
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
      <div class="detail-row">
        <span class="label">Mã đơn hàng</span>
        <span class="value">#${order.id}</span>
      </div>
      <div class="detail-row">
        <span class="label">Ngày đặt</span>
        <span class="value">${formatDate(order.orderDate)}</span>
      </div>
      <div class="detail-row">
        <span class="label">Địa chỉ</span>
        <span class="value">${addrText}</span>
      </div>
      <div class="detail-row">
        <span class="label">Vận chuyển</span>
        <span class="value">${shippingText}</span>
      </div>
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
        `,
          )
          .join("")}
      </div>
      <div class="detail-total-row" style="border-top:none;padding-top:4px;font-size:0.9rem;font-weight:500">
        <span>Tạm tính</span>
        <span>${formatPrice(lines.reduce((s, l) => s + l.price * l.qty, 0))}</span>
      </div>
      ${
        Number(order.shippingFee) > 0
          ? `
      <div class="detail-total-row" style="border-top:none;padding-top:4px;font-size:0.9rem;font-weight:500">
        <span>Phí vận chuyển</span>
        <span>${formatPrice(Number(order.shippingFee))}</span>
      </div>`
          : ""
      }
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

// Close on overlay click
document.addEventListener("click", (e) => {
  if (e.target.id === "orderDetailModal") {
    closeOrderDetail();
  }
});

// ===== CANCEL ORDER =====
async function cancelOrder(orderId) {
  if (!confirm("Bạn có chắc muốn huỷ đơn hàng này?")) return;

  try {
    const res = await fetchWithAuth(
      `${API_BASE}/orders/my-orders/${orderId}/cancel`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Khách hàng huỷ đơn" }),
      },
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
