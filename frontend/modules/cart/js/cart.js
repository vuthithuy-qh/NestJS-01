// ===== CART PAGE =====
// API_BASE, formatPrice, getToken, isLoggedIn, fetchWithAuth... từ config.js

let cartData = null;

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  await loadSharedComponents();

  if (!isLoggedIn()) {
    redirectToLogin();
    return;
  }

  await loadCart();
  initCartEvents();
});

// ===== LOAD CART =====
async function loadCart() {
  showLoading(true);
  try {
    const res = await fetchWithAuth(`${API_BASE}/shopping-cart`);
    const result = await res.json();
    cartData = result.data || result;

    if (!cartData.items || cartData.items.length === 0) {
      showEmpty();
    } else {
      renderCart();
    }
  } catch (err) {
    console.error("Lỗi tải giỏ hàng:", err);
    showEmpty();
  }
}

// ===== RENDER CART =====
function renderCart() {
  const container = document.getElementById("cartItems");

  container.innerHTML = cartData.items
    .map((item) => {
      const hasDiscount = item.promotion && item.discountedPrice < item.price;
      const priceHtml = hasDiscount
        ? `<span class="price-original">${formatPrice(item.price)}</span>
             <span class="price-sale">${formatPrice(item.discountedPrice)}</span>`
        : `${formatPrice(item.price)}`;
      const subTotalHtml = hasDiscount
        ? `<span class="price-sale">${formatPrice(item.subTotal)}</span>`
        : `${formatPrice(item.subTotal)}`;
      const promoTag = hasDiscount
        ? `<span class="item-promo-tag">${item.promotion.discountType === "percentage" ? `-${item.promotion.discountRate}%` : `-${formatPrice(item.promotion.discountAmount)}`}</span>`
        : "";

      return `
    <div class="cart-item" data-item-id="${item.id}" data-cat-spec-id="${item.catSpecId}">
      <input type="checkbox" class="item-checkbox" />
      <div class="item-product">
        <img src="${getCatImageUrl(item.catImage)}" alt="${item.catName}" 
             onerror="this.src='https://placehold.co/72x72/f0faf4/52b788?text=🐱'" />
        <div class="item-info">
          <div class="item-name">${item.catName} ${promoTag}</div>
          <div class="item-sku">${item.sku || ""}</div>
        </div>
      </div>
      <div class="item-price">${priceHtml}</div>
      <div class="item-qty">
        <button onclick="changeQty(${item.id}, -1)">−</button>
        <input type="number" value="${item.qty}" min="1" 
               onchange="setQty(${item.id}, this.value)" />
        <button onclick="changeQty(${item.id}, 1)">+</button>
      </div>
      <div class="item-subtotal">${subTotalHtml}</div>
      <button class="item-delete" onclick="removeItem(${item.id})" title="Xóa">🗑️</button>
    </div>
  `;
    })
    .join("");

  showLoading(false);
  document.getElementById("cartContent").style.display = "block";
  updateSummary();
}

// ===== UPDATE SUMMARY =====
function updateSummary() {
  const checkboxes = document.querySelectorAll(".item-checkbox");
  let selectedCount = 0;
  let subtotal = 0;
  let originalTotal = 0;

  checkboxes.forEach((cb, i) => {
    if (cb.checked && cartData.items[i]) {
      const item = cartData.items[i];
      selectedCount += item.qty;
      subtotal += item.subTotal; // discounted subtotal
      originalTotal += item.price * item.qty; // original subtotal
    }
  });

  const discount = originalTotal - subtotal;

  document.getElementById("selectedCount").textContent = selectedCount;
  document.getElementById("subtotalAmount").textContent =
    formatPrice(originalTotal);

  const discountEl = document.getElementById("discountAmount");
  if (discountEl) {
    discountEl.textContent = discount > 0 ? `-${formatPrice(discount)}` : "-0₫";
  }

  document.getElementById("totalAmount").textContent = formatPrice(subtotal);

  const btnCheckout = document.getElementById("btnCheckout");
  btnCheckout.disabled = selectedCount === 0;
}

// ===== CHANGE QUANTITY =====
async function changeQty(itemId, delta) {
  const item = cartData.items.find((i) => i.id === itemId);
  if (!item) return;

  const newQty = item.qty + delta;
  if (newQty < 1) return;

  await setQty(itemId, newQty);
}

async function setQty(itemId, newQty) {
  newQty = parseInt(newQty);
  if (isNaN(newQty) || newQty < 1) return;

  try {
    const res = await fetchWithAuth(
      `${API_BASE}/shopping-cart/items/${itemId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty: newQty }),
      },
    );

    if (!res.ok) {
      const err = await res.json();
      showToast(err.message || "Không thể cập nhật số lượng", "error");
      return;
    }

    const result = await res.json();
    cartData = result.data || result;
    renderCart();
  } catch (err) {
    showToast("Lỗi cập nhật giỏ hàng", "error");
  }
}

// ===== REMOVE ITEM =====
async function removeItem(itemId) {
  if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;

  try {
    const res = await fetchWithAuth(
      `${API_BASE}/shopping-cart/items/${itemId}`,
      {
        method: "DELETE",
      },
    );

    if (!res.ok) {
      showToast("Không thể xóa sản phẩm", "error");
      return;
    }

    const result = await res.json();
    cartData = result.data || result;

    if (!cartData.items || cartData.items.length === 0) {
      showEmpty();
    } else {
      renderCart();
    }

    showToast("Đã xóa sản phẩm khỏi giỏ hàng");
    updateCartBadge();
  } catch (err) {
    showToast("Lỗi xóa sản phẩm", "error");
  }
}

// ===== CLEAR CART =====
async function clearCart() {
  if (!confirm("Bạn có chắc muốn xóa toàn bộ giỏ hàng?")) return;

  try {
    await fetchWithAuth(`${API_BASE}/shopping-cart`, { method: "DELETE" });
    showEmpty();
    showToast("Đã xóa toàn bộ giỏ hàng");
    updateCartBadge();
  } catch (err) {
    showToast("Lỗi xóa giỏ hàng", "error");
  }
}

// ===== INIT EVENTS =====
function initCartEvents() {
  // Select all checkbox
  const selectAll = document.getElementById("selectAll");
  selectAll?.addEventListener("change", () => {
    document.querySelectorAll(".item-checkbox").forEach((cb) => {
      cb.checked = selectAll.checked;
    });
    updateSummary();
  });

  // Delegate checkbox change
  document.getElementById("cartItems")?.addEventListener("change", (e) => {
    if (e.target.classList.contains("item-checkbox")) {
      const allCbs = document.querySelectorAll(".item-checkbox");
      const allChecked = [...allCbs].every((cb) => cb.checked);
      if (selectAll) selectAll.checked = allChecked;
      updateSummary();
    }
  });

  // Checkout button
  document.getElementById("btnCheckout")?.addEventListener("click", () => {
    // Get selected item ids
    const checkboxes = document.querySelectorAll(".item-checkbox");
    const selectedIds = [];
    checkboxes.forEach((cb, i) => {
      if (cb.checked && cartData.items[i]) {
        selectedIds.push(cartData.items[i].id);
      }
    });

    if (selectedIds.length === 0) {
      showToast("Vui lòng chọn ít nhất 1 sản phẩm!", "error");
      return;
    }

    // Navigate to checkout with selected item IDs
    window.location.href = `../../checkout/html/checkout.html?items=${selectedIds.join(",")}`;
  });
}

// ===== UPDATE CART BADGE =====
function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (badge) {
    const count = cartData?.totalItems || 0;
    badge.textContent = count;
    badge.style.display = count > 0 ? "flex" : "none";
  }
}

// ===== UI HELPERS =====
function showLoading(show) {
  document.getElementById("loadingState").style.display = show
    ? "block"
    : "none";
  if (show) {
    document.getElementById("emptyState").style.display = "none";
    document.getElementById("cartContent").style.display = "none";
  }
}

function showEmpty() {
  showLoading(false);
  document.getElementById("emptyState").style.display = "block";
  document.getElementById("cartContent").style.display = "none";
}
