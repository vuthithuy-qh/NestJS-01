// ===== CHECKOUT PAGE — GHN INTEGRATION =====

let cartData = null;
let addresses = [];
let selectedAddressId = null;
let ghnServices = [];
let selectedServiceId = null;
let selectedShippingFee = 0;
let isNewAddress = true;

// Selected item IDs from cart page (via URL query param)
const selectedItemIds = (() => {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("items");
  if (!raw) return null; // null = checkout all
  return raw.split(",").map(Number).filter((n) => !isNaN(n) && n > 0);
})();

// GHN cache
const ghnCache = { provinces: null, districts: {}, wards: {} };

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  await loadSharedComponents();

  if (!isLoggedIn()) {
    redirectToLogin();
    return;
  }

  // Load cart + saved addresses + GHN provinces in parallel
  await Promise.all([loadCart(), loadSavedAddresses(), loadGHNProvinces()]);

  document.getElementById("loadingState").style.display = "none";
  document.getElementById("checkoutContent").style.display = "block";

  initEvents();
  updateSummary();
});

// ===== LOAD CART =====
async function loadCart() {
  try {
    const res = await fetchWithAuth(`${API_BASE}/shopping-cart`);
    const result = await res.json();
    cartData = result.data || result;

    // Filter by selected items from cart page
    if (selectedItemIds && selectedItemIds.length > 0 && cartData.items) {
      cartData.items = cartData.items.filter((item) =>
        selectedItemIds.includes(item.id),
      );
      // Recalculate totals for selected items only
      cartData.totalItems = cartData.items.reduce((s, i) => s + i.qty, 0);
      cartData.totalAmount = cartData.items.reduce((s, i) => s + i.subTotal, 0);
      // Recalculate discount for selected items only
      cartData.totalDiscount = cartData.items.reduce((s, i) => {
        const orig = i.price * i.qty;
        const disc = i.subTotal;
        return s + Math.max(0, orig - disc);
      }, 0);
    }

    renderOrderItems();
  } catch (err) {
    console.error("Lỗi tải giỏ hàng:", err);
    showToast("Không thể tải giỏ hàng", "error");
  }
}

// ===== LOAD SAVED ADDRESSES =====
async function loadSavedAddresses() {
  try {
    const res = await fetchWithAuth(`${API_BASE}/users/me`);
    const result = await res.json();
    const userData = result.data || result;
    addresses = userData.addresses || [];
    renderSavedAddresses();
  } catch (err) {
    addresses = [];
    renderSavedAddresses();
  }
}

// ============================================================
//  GHN MASTER DATA: Province → District → Ward
// ============================================================

async function loadGHNProvinces() {
  const sel = document.getElementById("ghnProvince");
  try {
    const data = await ghnFetch("/provinces");
    ghnCache.provinces = data.sort((a, b) =>
      a.ProvinceName.localeCompare(b.ProvinceName),
    );
    sel.innerHTML =
      '<option value="">-- Chọn Tỉnh/Thành phố --</option>' +
      ghnCache.provinces
        .map(
          (p) => `<option value="${p.ProvinceID}">${p.ProvinceName}</option>`,
        )
        .join("");
  } catch (err) {
    console.error("Lỗi tải tỉnh/thành:", err);
    sel.innerHTML =
      '<option value="">⚠ Không tải được (kiểm tra kết nối)</option>';
  }
}

async function loadGHNDistricts(provinceId) {
  const sel = document.getElementById("ghnDistrict");
  const wardSel = document.getElementById("ghnWard");

  sel.innerHTML = '<option value="">Đang tải...</option>';
  sel.disabled = true;
  wardSel.innerHTML = '<option value="">-- Chọn Phường/Xã --</option>';
  wardSel.disabled = true;
  clearShippingServices();

  try {
    if (!ghnCache.districts[provinceId]) {
      const data = await ghnFetch(`/districts?province_id=${provinceId}`);
      ghnCache.districts[provinceId] = data.sort((a, b) =>
        a.DistrictName.localeCompare(b.DistrictName),
      );
    }
    const districts = ghnCache.districts[provinceId];
    sel.innerHTML =
      '<option value="">-- Chọn Quận/Huyện --</option>' +
      districts
        .map(
          (d) => `<option value="${d.DistrictID}">${d.DistrictName}</option>`,
        )
        .join("");
    sel.disabled = false;
  } catch (err) {
    sel.innerHTML = '<option value="">Lỗi tải quận/huyện</option>';
  }
}

async function loadGHNWards(districtId) {
  const sel = document.getElementById("ghnWard");
  sel.innerHTML = '<option value="">Đang tải...</option>';
  sel.disabled = true;
  clearShippingServices();

  try {
    if (!ghnCache.wards[districtId]) {
      const data = await ghnFetch(`/wards?district_id=${districtId}`);
      ghnCache.wards[districtId] = (data || []).sort((a, b) =>
        (a.WardName || "").localeCompare(b.WardName || ""),
      );
    }
    const wards = ghnCache.wards[districtId];
    sel.innerHTML =
      '<option value="">-- Chọn Phường/Xã --</option>' +
      wards
        .map((w) => `<option value="${w.WardCode}">${w.WardName}</option>`)
        .join("");
    sel.disabled = false;
  } catch (err) {
    sel.innerHTML = '<option value="">Lỗi tải phường/xã</option>';
  }
}

// ============================================================
//  GHN SHIPPING: Available services + Fee calculation
// ============================================================

async function loadShippingServices(districtId, wardCode) {
  const container = document.getElementById("shippingServices");
  container.innerHTML =
    '<div class="shipping-loading"><div class="spinner-sm"></div> Đang tính phí vận chuyển...</div>';

  ghnServices = [];
  selectedServiceId = null;
  selectedShippingFee = 0;

  try {
    // 1. Get available services via backend proxy
    const services = await ghnFetch("/services", "POST", {
      toDistrictId: parseInt(districtId),
    });

    if (!services || services.length === 0) {
      container.innerHTML =
        '<p class="shipping-note">Không có dịch vụ vận chuyển khả dụng cho khu vực này.</p>';
      updateSummary();
      return;
    }

    // 2. Calculate fee for each service via backend proxy
    const insuranceValue = cartData?.totalAmount || 0;

    const servicesWithFee = await Promise.all(
      services.map(async (svc) => {
        try {
          const feeData = await ghnFetch("/fee", "POST", {
            serviceTypeId: svc.service_type_id,
            toDistrictId: parseInt(districtId),
            toWardCode: wardCode,
            insuranceValue: insuranceValue,
          });
          return {
            ...svc,
            fee: feeData.total,
            expectedDelivery: feeData.expected_delivery_time || null,
          };
        } catch {
          return { ...svc, fee: null };
        }
      }),
    );

    ghnServices = servicesWithFee.filter((s) => s.fee != null);
    renderShippingServices();
  } catch (err) {
    console.error("Lỗi tải dịch vụ GHN:", err);
    container.innerHTML =
      '<p class="shipping-note">⚠ Không thể tính phí vận chuyển. Vui lòng kiểm tra địa chỉ.</p>';
    updateSummary();
  }
}

function renderShippingServices() {
  const container = document.getElementById("shippingServices");

  if (ghnServices.length === 0) {
    container.innerHTML =
      '<p class="shipping-note">Không có dịch vụ vận chuyển khả dụng.</p>';
    updateSummary();
    return;
  }

  container.innerHTML = ghnServices
    .map(
      (svc, i) => `
    <label class="shipping-option ${i === 0 ? "selected" : ""}" data-sid="${svc.service_id}">
      <input type="radio" name="shipping" value="${svc.service_id}"
             data-fee="${svc.fee}" data-name="${svc.short_name}"
             ${i === 0 ? "checked" : ""} />
      <div class="shipping-info">
        <div class="shipping-name">${svc.short_name}</div>
        <div class="shipping-desc">${formatGHNTime(svc.expectedDelivery)}</div>
      </div>
      <div class="shipping-price">${formatPrice(svc.fee)}</div>
    </label>
  `,
    )
    .join("");

  // Default select first
  selectedServiceId = ghnServices[0].service_id;
  selectedShippingFee = ghnServices[0].fee;

  // Bind radio events
  container.querySelectorAll('input[name="shipping"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      selectedServiceId = parseInt(radio.value);
      selectedShippingFee = Number(radio.dataset.fee);
      container
        .querySelectorAll(".shipping-option")
        .forEach((o) => o.classList.remove("selected"));
      radio.closest(".shipping-option").classList.add("selected");
      updateSummary();
    });
  });

  updateSummary();
}

function formatGHNTime(timeStr) {
  if (!timeStr) return "";
  try {
    const d = new Date(timeStr);
    if (isNaN(d)) return "";
    return `Dự kiến: ${d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}`;
  } catch {
    return "";
  }
}

function clearShippingServices() {
  ghnServices = [];
  selectedServiceId = null;
  selectedShippingFee = 0;
  document.getElementById("shippingServices").innerHTML =
    '<p class="shipping-note">Vui lòng chọn địa chỉ để xem phí vận chuyển</p>';
  updateSummary();
}

// ============================================================
//  SAVED ADDRESSES
// ============================================================

function renderSavedAddresses() {
  const listEl = document.getElementById("savedAddresses");
  const btnNewAddr = document.getElementById("btnNewAddress");
  if (!listEl) return;

  if (addresses.length === 0) {
    listEl.style.display = "none";
    btnNewAddr.style.display = "none";
    switchToNewAddress();
    return;
  }

  // Show saved addresses + button
  listEl.style.display = "flex";
  btnNewAddr.style.display = "block";

  listEl.innerHTML = addresses
    .map(
      (addr) => `
    <label class="address-option" data-aid="${addr.id}">
      <input type="radio" name="savedAddr" value="${addr.id}"
             data-district-id="${addr.street_number || ""}"
             data-ward-code="${addr.postal_code || ""}" />
      <div class="address-detail">
        <div class="addr-text">
          ${addr.address_line1 || ""}${addr.address_line2 ? ", " + addr.address_line2 : ""}${addr.city ? ", " + addr.city : ""}${addr.region ? ", " + addr.region : ""}
        </div>
      </div>
    </label>
  `,
    )
    .join("");

  // Bind events
  listEl.querySelectorAll('input[name="savedAddr"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      isNewAddress = false;
      selectedAddressId = parseInt(radio.value);

      // Highlight
      listEl
        .querySelectorAll(".address-option")
        .forEach((o) => o.classList.remove("selected"));
      radio.closest(".address-option").classList.add("selected");

      // Hide new address form
      document.getElementById("newAddressForm").style.display = "none";

      // Try shipping calc with stored GHN codes
      const districtId = radio.dataset.districtId;
      const wardCode = radio.dataset.wardCode;
      if (districtId && wardCode && districtId !== "" && wardCode !== "") {
        loadShippingServices(districtId, wardCode);
      } else {
        clearShippingServices();
        showToast(
          "Địa chỉ này chưa có dữ liệu GHN. Hãy tạo địa chỉ mới.",
          "info",
        );
      }

      validateCheckout();
    });
  });
}

function switchToNewAddress() {
  isNewAddress = true;
  selectedAddressId = null;

  document.getElementById("newAddressForm").style.display = "block";

  // Deselect saved addresses
  const savedEl = document.getElementById("savedAddresses");
  savedEl
    ?.querySelectorAll(".address-option")
    .forEach((o) => o.classList.remove("selected"));
  savedEl
    ?.querySelectorAll("input[name='savedAddr']")
    .forEach((r) => (r.checked = false));

  clearShippingServices();
  validateCheckout();
}

// ============================================================
//  ORDER ITEMS
// ============================================================

function renderOrderItems() {
  const container = document.getElementById("orderItems");
  if (!cartData || !cartData.items || cartData.items.length === 0) {
    container.innerHTML =
      '<p style="color:var(--text-muted)">Giỏ hàng trống</p>';
    return;
  }

  container.innerHTML = cartData.items
    .map(
      (item) => {
        const hasDiscount = item.promotion && item.discountedPrice < item.price;
        const priceHtml = hasDiscount
          ? `<span style="text-decoration:line-through;color:var(--text-muted);font-size:12px">${formatPrice(item.price * item.qty)}</span>
             <span style="color:var(--danger);font-weight:700">${formatPrice(item.subTotal)}</span>`
          : formatPrice(item.subTotal);

        return `
    <div class="order-item">
      <img src="${getCatImageUrl(item.catImage)}" alt="${item.catName}"
           onerror="this.src='https://placehold.co/56x56/f0faf4/52b788?text=🐱'" />
      <div class="order-item-info">
        <div class="oi-name">${item.catName}</div>
        <div class="oi-sku">${item.sku || ""}</div>
      </div>
      <div class="order-item-qty">x${item.qty}</div>
      <div class="order-item-price">${priceHtml}</div>
    </div>
  `;
      },
    )
    .join("");
}

// ============================================================
//  SUMMARY + VALIDATION
// ============================================================

function updateSummary() {
  if (!cartData) return;

  const subtotal = cartData.totalAmount || 0;  // already discounted
  const totalItems = cartData.totalItems || 0;
  const discount = cartData.totalDiscount || 0;
  const originalTotal = subtotal + discount;    // original before discount
  const total = subtotal + selectedShippingFee;

  document.getElementById("itemCount").textContent = totalItems;
  document.getElementById("subtotalAmount").textContent = formatPrice(originalTotal);
  document.getElementById("shippingFee").textContent =
    selectedShippingFee > 0 ? formatPrice(selectedShippingFee) : "Chưa tính";
  document.getElementById("totalAmount").textContent = formatPrice(total);

  // Show discount row if applicable
  const discountRow = document.getElementById("discountRow");
  const discountEl = document.getElementById("discountAmount");
  if (discountRow && discountEl) {
    if (discount > 0) {
      discountRow.style.display = "flex";
      discountEl.textContent = `-${formatPrice(discount)}`;
    } else {
      discountRow.style.display = "none";
    }
  }

  validateCheckout();
}

function validateCheckout() {
  const btn = document.getElementById("btnPlaceOrder");

  let addressOk = false;
  if (isNewAddress) {
    const prov = document.getElementById("ghnProvince").value;
    const dist = document.getElementById("ghnDistrict").value;
    const ward = document.getElementById("ghnWard").value;
    const street = document.getElementById("addrStreet").value.trim();
    addressOk = !!(prov && dist && ward && street);
  } else {
    addressOk = !!selectedAddressId;
  }

  const shippingOk = !!(selectedServiceId && selectedShippingFee > 0);
  const cartOk = !!(cartData && cartData.items && cartData.items.length > 0);

  btn.disabled = !(addressOk && shippingOk && cartOk);
}

// ============================================================
//  EVENTS
// ============================================================

function initEvents() {
  // Province → load districts
  document.getElementById("ghnProvince").addEventListener("change", (e) => {
    const v = e.target.value;
    if (v) {
      loadGHNDistricts(v);
    } else {
      resetDistrictWard();
    }
    validateCheckout();
  });

  // District → load wards
  document.getElementById("ghnDistrict").addEventListener("change", (e) => {
    const v = e.target.value;
    if (v) {
      loadGHNWards(v);
    } else {
      resetWard();
    }
    validateCheckout();
  });

  // Ward → trigger shipping calculation
  document.getElementById("ghnWard").addEventListener("change", (e) => {
    const wardCode = e.target.value;
    const districtId = document.getElementById("ghnDistrict").value;
    if (wardCode && districtId) {
      loadShippingServices(districtId, wardCode);
    } else {
      clearShippingServices();
    }
    validateCheckout();
  });

  // Street input
  document
    .getElementById("addrStreet")
    ?.addEventListener("input", () => validateCheckout());

  // "Thêm địa chỉ mới" button
  document
    .getElementById("btnNewAddress")
    ?.addEventListener("click", () => switchToNewAddress());

  // Place order
  document
    .getElementById("btnPlaceOrder")
    .addEventListener("click", placeOrder);
}

function resetDistrictWard() {
  document.getElementById("ghnDistrict").innerHTML =
    '<option value="">-- Chọn Quận/Huyện --</option>';
  document.getElementById("ghnDistrict").disabled = true;
  resetWard();
}

function resetWard() {
  document.getElementById("ghnWard").innerHTML =
    '<option value="">-- Chọn Phường/Xã --</option>';
  document.getElementById("ghnWard").disabled = true;
  clearShippingServices();
}

// ============================================================
//  PLACE ORDER
// ============================================================

async function placeOrder() {
  const btn = document.getElementById("btnPlaceOrder");
  btn.disabled = true;
  btn.textContent = "Đang xử lý...";

  try {
    let addressId = selectedAddressId;

    // If new address → save it first
    if (isNewAddress || !addressId) {
      addressId = await saveNewAddress();
      if (!addressId) throw new Error("Không thể lưu địa chỉ");
    }

    // Shipping service name for notes
    const serviceName =
      ghnServices.find((s) => s.service_id === selectedServiceId)?.short_name ||
      "GHN";

    const notes = document.getElementById("orderNotes")?.value?.trim() || "";

    const orderBody = {
      addressId,
      shippingFee: selectedShippingFee,
      notes: notes
        ? `${notes}\n[Ship: ${serviceName} – ${formatPrice(selectedShippingFee)}]`
        : `[Ship: ${serviceName} – ${formatPrice(selectedShippingFee)}]`,
    };

    // Only order selected items (not entire cart)
    if (selectedItemIds && selectedItemIds.length > 0) {
      orderBody.itemIds = selectedItemIds;
    }

    const res = await fetchWithAuth(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderBody),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Đặt hàng thất bại");
    }

    showToast("Đặt hàng thành công! 🎉");
    setTimeout(() => {
      window.location.href = "../../orders/html/orders.html";
    }, 1500);
  } catch (err) {
    showToast(err.message || "Lỗi đặt hàng", "error");
    btn.disabled = false;
    btn.textContent = "Đặt hàng";
  }
}

// ===== SAVE NEW ADDRESS (returns address ID) =====
async function saveNewAddress() {
  const provinceEl = document.getElementById("ghnProvince");
  const districtEl = document.getElementById("ghnDistrict");
  const wardEl = document.getElementById("ghnWard");
  const street = document.getElementById("addrStreet").value.trim();
  const detail = document.getElementById("addrDetail")?.value?.trim() || "";

  const provinceName = provinceEl.options[provinceEl.selectedIndex]?.text || "";
  const districtName = districtEl.options[districtEl.selectedIndex]?.text || "";
  const wardName = wardEl.options[wardEl.selectedIndex]?.text || "";

  const res = await fetchWithAuth(`${API_BASE}/users/me/addresses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      unit_number: String(provinceEl.value), // GHN province ID
      street_number: String(districtEl.value), // GHN district ID
      address_line1: street + (detail ? ", " + detail : ""),
      address_line2: wardName,
      city: districtName,
      region: provinceName,
      postal_code: String(wardEl.value), // GHN ward code
      country_id: 1, // Vietnam
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Không thể lưu địa chỉ");
  }

  const result = await res.json();
  const addr = result.data || result;
  return addr.id;
}
