// ===== CAT DETAIL MODULE =====
// API_BASE, formatPrice, getCatImageUrl... từ shared/js/config.js

// ===== STATE =====
let catData = null; // Dữ liệu mèo hiện tại
let selectedSpec = null; // Spec đang chọn
let selectedOptions = {}; // { variantId: optionId } — variant đang chọn
let variantMap = {}; // Map variant data để dễ tra cứu
let currentPromotion = null; // Promotion đang áp dụng cho category này

// ===== DOM ELEMENTS =====
const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const detailContent = document.getElementById("detailContent");
const descriptionSection = document.getElementById("descriptionSection");

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  await loadSharedComponents();

  const urlParams = new URLSearchParams(window.location.search);
  const catId = urlParams.get("id");

  if (!catId) {
    showError("Không tìm thấy ID mèo.");
    return;
  }

  await loadCatDetail(catId);
  initQuantityControls();
  initActionButtons();
});

// ===== LOAD CAT DETAIL =====
async function loadCatDetail(catId) {
  try {
    const res = await fetch(`${API_BASE}/cats/${catId}`);
    if (!res.ok) throw new Error("Not found");

    const result = await res.json();
    catData = result.data || result;

    // Fetch promotions cho category này
    if (catData.categoryId) {
      const promotions = await getActivePromotions(catData.categoryId);
      if (promotions.length > 0 && catData.specs && catData.specs.length > 0) {
        const samplePrice = parseFloat(catData.specs[0].price);
        currentPromotion = getBestPromotion(promotions, samplePrice);
      }
    }

    renderDetail();

    // Load related cats (fire in parallel with tracking)
    loadRelatedCats(catId);

    // Track view interaction for ranking algorithm
    trackCatView(catId);
  } catch (err) {
    console.error("Lỗi tải chi tiết:", err);
    showError("Không thể tải thông tin mèo. Vui lòng thử lại sau.");
  }
}

// ===== RENDER DETAIL =====
function renderDetail() {
  if (!catData) return;

  loadingState.style.display = "none";
  detailContent.style.display = "grid";

  // Breadcrumb
  document.getElementById("breadcrumbCategory").textContent =
    catData.categoryName || catData.category?.name || "Mèo";
  document.getElementById("breadcrumbName").textContent = catData.name;
  document.title = `${catData.name} — Pet Shop Vu`;

  // Cat Name
  document.getElementById("catName").textContent = catData.name;

  // Status Badge
  const statusEl = document.getElementById("catStatus");
  const statusMap = {
    available: { text: "Có sẵn", class: "badge-available" },
    sold: { text: "Đã bán", class: "badge-sold" },
    reserved: { text: "Đã đặt", class: "badge-reserved" },
  };
  const statusInfo = statusMap[catData.status] || statusMap.available;
  statusEl.textContent = statusInfo.text;
  statusEl.className = `badge ${statusInfo.class}`;

  // Gender Badge
  const genderEl = document.getElementById("catGender");
  const genderMap = {
    male: { text: "♂ Đực", class: "badge-male" },
    female: { text: "♀ Cái", class: "badge-female" },
    unknown: { text: "Chưa rõ", class: "badge-unknown" },
  };
  const genderInfo = genderMap[catData.gender] || genderMap.unknown;
  genderEl.textContent = genderInfo.text;
  genderEl.className = `badge ${genderInfo.class}`;

  // Category
  document.getElementById("catCategory").textContent =
    catData.categoryName || catData.category?.name || "";

  // Promotion badge
  const promoEl = document.getElementById("promoInfo");
  if (promoEl && currentPromotion) {
    const discountLabel =
      currentPromotion.discountType === "percentage"
        ? `Giảm ${currentPromotion.discountRate}%`
        : `Giảm ${formatPrice(currentPromotion.discountAmount)}`;
    promoEl.innerHTML = `
      <div class="promo-banner">
        <span class="promo-icon">🏷️</span>
        <span class="promo-text">${currentPromotion.name}: <strong>${discountLabel}</strong></span>
      </div>
    `;
    promoEl.style.display = "block";
  }

  // Description
  if (catData.description) {
    descriptionSection.style.display = "block";
    document.getElementById("catDescription").textContent = catData.description;
  }

  // Build variant map + render variants
  buildVariantMap();
  renderVariants();

  // Auto-select first available spec (ưu tiên spec còn hàng)
  if (catData.specs && catData.specs.length > 0) {
    const availableSpec = catData.specs.find((s) => s.qtyInStock > 0);
    selectSpec(availableSpec || catData.specs[0]);
  } else {
    updatePriceDisplay(null);
  }

  // Render images
  renderImages();
}

// ===== BUILD VARIANT MAP =====
// Phân tích specs để tạo ra cấu trúc variants dễ dùng
function buildVariantMap() {
  variantMap = {};

  if (!catData.specs) return;

  catData.specs.forEach((spec) => {
    if (!spec.configurations) return;

    spec.configurations.forEach((config) => {
      const vId = config.variantId;
      const vName = config.variantName;
      const optionValue = config.value;
      const optionId = config.id; // config.id = variantOption.id

      if (!variantMap[vId]) {
        variantMap[vId] = {
          id: vId,
          name: vName,
          options: {},
        };
      }

      if (!variantMap[vId].options[optionId]) {
        variantMap[vId].options[optionId] = {
          id: optionId,
          value: optionValue,
        };
      }
    });
  });
}

// ===== RENDER VARIANT SELECTORS =====
function renderVariants() {
  const section = document.getElementById("variantSection");
  section.innerHTML = "";

  const variantIds = Object.keys(variantMap);
  if (variantIds.length === 0) {
    // Không có variants → ẩn section
    section.style.display = "none";
    return;
  }

  section.style.display = "flex";

  variantIds.forEach((vId) => {
    const variant = variantMap[vId];
    const group = document.createElement("div");
    group.className = "variant-group";
    group.dataset.variantId = vId;

    const options = Object.values(variant.options);

    group.innerHTML = `
      <div class="variant-group-label">${variant.name}:</div>
      <div class="variant-options">
        ${options
          .map(
            (opt) => `
          <button class="variant-option-btn" 
                  data-variant-id="${vId}" 
                  data-option-id="${opt.id}"
                  data-option-value="${opt.value}">
            ${opt.value}
          </button>
        `,
          )
          .join("")}
      </div>
    `;

    section.appendChild(group);
  });

  // Bind click events
  section.querySelectorAll(".variant-option-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const variantId = btn.dataset.variantId;
      const optionId = btn.dataset.optionId;

      // Toggle: nếu đang chọn rồi thì bỏ chọn
      if (selectedOptions[variantId] === optionId) {
        delete selectedOptions[variantId];
        btn.classList.remove("active");
      } else {
        // Bỏ active cũ trong cùng variant group
        btn
          .closest(".variant-options")
          .querySelectorAll(".variant-option-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        selectedOptions[variantId] = optionId;
      }

      // Tìm spec match
      findMatchingSpec();
    });
  });
}

// ===== FIND MATCHING SPEC =====
// Tìm spec khớp với tất cả variant options đang chọn
function findMatchingSpec() {
  if (!catData.specs) return;

  const selectedOptionIds = Object.values(selectedOptions);
  const variantCount = Object.keys(variantMap).length;

  // Nếu chưa chọn đủ variants → hiển thị giá thấp nhất
  if (selectedOptionIds.length < variantCount) {
    // Tìm specs có chứa TẤT CẢ options đã chọn
    const partialMatches = catData.specs.filter((spec) => {
      if (!spec.configurations) return false;
      const specOptionIds = spec.configurations.map((c) => String(c.id));
      return selectedOptionIds.every((id) => specOptionIds.includes(id));
    });

    if (partialMatches.length > 0) {
      // Hiển thị price range
      const prices = partialMatches.map((s) => parseFloat(s.price));
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      const priceEl = document.getElementById("catPrice");
      priceEl.innerHTML = renderPriceRangeHtml(
        minPrice,
        maxPrice,
        currentPromotion,
      );

      // Tổng stock
      const totalStock = partialMatches.reduce(
        (sum, s) => sum + (s.qtyInStock || 0),
        0,
      );
      updateStockDisplay(totalStock);
      document.getElementById("catSku").textContent = "";
      selectedSpec = null;
    }

    updateAvailableOptions();
    return;
  }

  // Đã chọn đủ → tìm exact match
  const matchedSpec = catData.specs.find((spec) => {
    if (!spec.configurations) return false;
    const specOptionIds = spec.configurations.map((c) => String(c.id));
    return (
      specOptionIds.length === selectedOptionIds.length &&
      selectedOptionIds.every((id) => specOptionIds.includes(id))
    );
  });

  if (matchedSpec) {
    selectSpec(matchedSpec);
  } else {
    // Không tìm thấy combo → thông báo
    selectedSpec = null;
    document.getElementById("catPrice").textContent = "Không có sẵn";
    updateStockDisplay(0);
    document.getElementById("catSku").textContent = "";
  }

  updateAvailableOptions();
}

// ===== UPDATE AVAILABLE OPTIONS =====
// Disable các options không có spec nào match
function updateAvailableOptions() {
  document.querySelectorAll(".variant-option-btn").forEach((btn) => {
    const vId = btn.dataset.variantId;
    const oId = btn.dataset.optionId;

    // Tạo test selection: giữ lại tất cả đã chọn, thay variant này bằng option đang test
    const testSelection = { ...selectedOptions, [vId]: oId };
    const testOptionIds = Object.values(testSelection);

    // Kiểm tra có spec nào chứa tất cả test options không
    const hasMatch = catData.specs.some((spec) => {
      if (!spec.configurations) return false;
      const specOptionIds = spec.configurations.map((c) => String(c.id));
      return testOptionIds.every((id) => specOptionIds.includes(id));
    });

    if (hasMatch) {
      btn.classList.remove("disabled");
      btn.disabled = false;
    } else {
      btn.classList.add("disabled");
      btn.disabled = true;
    }
  });
}

// ===== SELECT SPEC =====
function selectSpec(spec) {
  selectedSpec = spec;

  // Update selected options from spec configurations
  if (spec.configurations) {
    selectedOptions = {};
    spec.configurations.forEach((config) => {
      const vId = String(config.variantId);
      const oId = String(config.id);
      selectedOptions[vId] = oId;
    });

    // Highlight selected options in UI
    document.querySelectorAll(".variant-option-btn").forEach((btn) => {
      const vId = btn.dataset.variantId;
      const oId = btn.dataset.optionId;
      if (selectedOptions[vId] === oId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  updatePriceDisplay(spec);
  updateSpecImage(spec);
}

// ===== UPDATE PRICE DISPLAY =====
function updatePriceDisplay(spec) {
  const priceEl = document.getElementById("catPrice");
  const skuEl = document.getElementById("catSku");

  if (!spec) {
    // Không có spec → hiện price range hoặc "Liên hệ"
    if (catData.specs && catData.specs.length > 0) {
      const prices = catData.specs.map((s) => parseFloat(s.price));
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      priceEl.innerHTML = renderPriceRangeHtml(min, max, currentPromotion);

      const totalStock = catData.specs.reduce(
        (sum, s) => sum + (s.qtyInStock || 0),
        0,
      );
      updateStockDisplay(totalStock);
    } else {
      priceEl.innerHTML = '<span class="price-current">Liên hệ</span>';
      updateStockDisplay(0);
    }
    skuEl.textContent = "";
    return;
  }

  const price = parseFloat(spec.price);
  priceEl.innerHTML = renderPriceHtml(price, currentPromotion);
  skuEl.textContent = spec.sku ? `SKU: ${spec.sku}` : "";
  updateStockDisplay(spec.qtyInStock || 0);
}

// ===== UPDATE STOCK DISPLAY =====
function updateStockDisplay(qty) {
  const stockEl = document.getElementById("catStock");
  const qtyAvail = document.getElementById("qtyAvailable");
  const qtyInput = document.getElementById("qtyInput");

  if (qty > 0) {
    stockEl.textContent = `Còn ${qty} sản phẩm`;
    stockEl.className = "stock-info in-stock";
    qtyAvail.textContent = `${qty} sản phẩm có sẵn`;
    qtyInput.max = qty;
    if (parseInt(qtyInput.value) > qty) {
      qtyInput.value = qty;
    }
  } else {
    stockEl.textContent = "Hết hàng";
    stockEl.className = "stock-info out-of-stock";
    qtyAvail.textContent = "Hết hàng";
    qtyInput.max = 0;
    qtyInput.value = 1;
  }
}

// ===== RENDER IMAGES =====
function renderImages() {
  const mainImg = document.getElementById("mainImage");
  const thumbList = document.getElementById("thumbnailList");

  // Collect all images: main cat image + spec images
  const images = [];

  if (catData.image) {
    images.push({
      url: getCatImageUrl(catData.image),
      label: catData.name,
    });
  }

  if (catData.specs) {
    catData.specs.forEach((spec) => {
      if (spec.catImage) {
        const configLabel = spec.configurations
          ? spec.configurations.map((c) => c.value).join(", ")
          : spec.sku;
        images.push({
          url: getCatImageUrl(spec.catImage),
          label: configLabel,
        });
      }
    });
  }

  if (images.length === 0) {
    images.push({
      url: "https://placehold.co/500x500/f0faf4/52b788?text=🐱",
      label: "No image",
    });
  }

  // Set main image
  mainImg.src = images[0].url;
  mainImg.alt = images[0].label;
  mainImg.onerror = function () {
    this.src = "https://placehold.co/500x500/f0faf4/52b788?text=🐱";
  };

  // Render thumbnails
  if (images.length > 1) {
    thumbList.innerHTML = images
      .map(
        (img, i) => `
      <div class="thumbnail-item ${i === 0 ? "active" : ""}" data-index="${i}">
        <img src="${img.url}" alt="${img.label}" 
             onerror="this.src='https://placehold.co/72x72/f0faf4/52b788?text=🐱'" />
      </div>
    `,
      )
      .join("");

    thumbList.querySelectorAll(".thumbnail-item").forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const idx = parseInt(thumb.dataset.index);
        mainImg.src = images[idx].url;
        mainImg.alt = images[idx].label;
        thumbList
          .querySelectorAll(".thumbnail-item")
          .forEach((t) => t.classList.remove("active"));
        thumb.classList.add("active");
      });
    });
  }
}

// ===== UPDATE SPEC IMAGE =====
function updateSpecImage(spec) {
  if (spec && spec.catImage) {
    const mainImg = document.getElementById("mainImage");
    mainImg.src = getCatImageUrl(spec.catImage);
  }
}

// ===== QUANTITY CONTROLS =====
function initQuantityControls() {
  const qtyInput = document.getElementById("qtyInput");
  const qtyMinus = document.getElementById("qtyMinus");
  const qtyPlus = document.getElementById("qtyPlus");

  qtyMinus.addEventListener("click", () => {
    const val = parseInt(qtyInput.value) || 1;
    if (val > 1) qtyInput.value = val - 1;
  });

  qtyPlus.addEventListener("click", () => {
    const val = parseInt(qtyInput.value) || 1;
    const max = parseInt(qtyInput.max) || 999;
    if (val < max) qtyInput.value = val + 1;
  });

  qtyInput.addEventListener("change", () => {
    let val = parseInt(qtyInput.value) || 1;
    const max = parseInt(qtyInput.max) || 999;
    if (val < 1) val = 1;
    if (val > max) val = max;
    qtyInput.value = val;
  });
}

// ===== ACTION BUTTONS =====
function initActionButtons() {
  const btnAddCart = document.getElementById("btnAddCart");
  const btnBuyNow = document.getElementById("btnBuyNow");

  btnAddCart.addEventListener("click", async () => {
    if (!isLoggedIn()) {
      alert("Vui lòng đăng nhập để thêm vào giỏ hàng!");
      redirectToLogin();
      return;
    }

    if (!selectedSpec) {
      alert("Vui lòng chọn đầy đủ phân loại!");
      return;
    }

    if ((selectedSpec.qtyInStock || 0) <= 0) {
      alert("Sản phẩm đã hết hàng!");
      return;
    }

    const qty = parseInt(document.getElementById("qtyInput").value) || 1;

    btnAddCart.disabled = true;
    try {
      const res = await fetchWithAuth(`${API_BASE}/shopping-cart/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catSpecId: selectedSpec.id, qty }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Thêm vào giỏ thất bại");
      }
      const result = await res.json();
      showToast(`Đã thêm "${catData.name}" (x${qty}) vào giỏ hàng!`, "success");
      updateCartBadge(result.data || result);

      // Track cart_add interaction for ranking
      trackCatView(catData.id, "cart_add");
    } catch (err) {
      showToast(err.message || "Lỗi thêm vào giỏ hàng", "error");
    } finally {
      btnAddCart.disabled = false;
    }
  });

  btnBuyNow.addEventListener("click", async () => {
    if (!isLoggedIn()) {
      alert("Vui lòng đăng nhập để mua hàng!");
      redirectToLogin();
      return;
    }

    if (!selectedSpec) {
      alert("Vui lòng chọn đầy đủ phân loại!");
      return;
    }

    if ((selectedSpec.qtyInStock || 0) <= 0) {
      alert("Sản phẩm đã hết hàng!");
      return;
    }

    const qty = parseInt(document.getElementById("qtyInput").value) || 1;

    btnBuyNow.disabled = true;
    try {
      const res = await fetchWithAuth(`${API_BASE}/shopping-cart/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catSpecId: selectedSpec.id, qty }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Thêm vào giỏ thất bại");
      }
      window.location.href = "../../checkout/html/checkout.html";
    } catch (err) {
      showToast(err.message || "Lỗi thêm vào giỏ hàng", "error");
      btnBuyNow.disabled = false;
    }
  });
}

// ===== SHOW ERROR =====
function showError(message) {
  loadingState.style.display = "none";
  detailContent.style.display = "none";
  descriptionSection.style.display = "none";
  errorState.style.display = "block";
  document.getElementById("errorMessage").textContent = message;
}

// ===== RELATED CATS =====
async function loadRelatedCats(catId) {
  try {
    const res = await fetch(`${API_BASE}/cats/${catId}/related?limit=8`);
    if (!res.ok) return;

    const result = await res.json();
    // ResponseInterceptor wraps: {statusCode, message, data: [...]}
    const raw = result.data || result;
    const cats = Array.isArray(raw) ? raw : raw.data || raw;

    if (!Array.isArray(cats) || cats.length === 0) return;

    // Fetch promotions for all unique categoryIds
    const categoryIds = [
      ...new Set(cats.map((c) => c.categoryId).filter(Boolean)),
    ];
    const promoMap = {};
    await Promise.all(
      categoryIds.map(async (cid) => {
        promoMap[cid] = await getActivePromotions(cid);
      }),
    );

    renderRelatedCats(cats, promoMap);
  } catch (err) {
    console.error("Lỗi tải mèo liên quan:", err);
  }
}

function renderRelatedCats(cats, promoMap) {
  const section = document.getElementById("relatedSection");
  const grid = document.getElementById("relatedGrid");
  if (!section || !grid) return;

  grid.innerHTML = cats
    .map((cat) => {
      const imageUrl = cat.image
        ? getCatImageUrl(cat.image)
        : "https://placehold.co/300x300/f0faf4/52b788?text=🐱";

      // Min price from specs
      const price =
        cat.specs && cat.specs.length > 0
          ? Math.min(...cat.specs.map((s) => parseFloat(s.price)))
          : 0;

      // Gender badge
      let genderBadge = "";
      if (cat.gender === "male") {
        genderBadge = '<span class="badge gender-male">♂ Đực</span>';
      } else if (cat.gender === "female") {
        genderBadge = '<span class="badge gender-female">♀ Cái</span>';
      }

      // Status badge
      const totalStock =
        cat.specs?.reduce((sum, s) => sum + (s.qtyInStock || 0), 0) || 0;
      let statusBadge = "";
      if (cat.status === "sold") {
        statusBadge =
          '<span class="badge status" style="background:var(--danger)">Đã bán</span>';
      } else if (cat.status === "reserved") {
        statusBadge =
          '<span class="badge status" style="background:var(--warning)">Đã đặt</span>';
      } else if (totalStock <= 0) {
        statusBadge =
          '<span class="badge status" style="background:var(--text-muted)">Hết hàng</span>';
      }

      const categoryName = cat.categoryName || cat.category?.name || "";

      // Promotion
      const promotions = promoMap[cat.categoryId] || [];
      const bestPromo = price > 0 ? getBestPromotion(promotions, price) : null;
      const priceHtml =
        price > 0
          ? renderPriceHtml(price, bestPromo)
          : '<span class="price-current">Liên hệ</span>';

      const promoTag = bestPromo
        ? `<div class="rc-promo-tag">${bestPromo.discountType === "percentage" ? `-${bestPromo.discountRate}%` : `Giảm ${formatPrice(bestPromo.discountAmount)}`}</div>`
        : "";

      return `
        <div class="related-card" onclick="window.location.href='cat-detail.html?id=${cat.id}'">
          <div class="rc-image">
            <img src="${imageUrl}" alt="${cat.name}" loading="lazy"
                 onerror="this.src='https://placehold.co/300x300/f0faf4/52b788?text=🐱'" />
            ${promoTag}
          </div>
          <div class="rc-badges">${statusBadge}${genderBadge}</div>
          <div class="rc-info">
            <div class="rc-name">${cat.name}</div>
            <div class="rc-category">${categoryName}</div>
            <div class="rc-price">${priceHtml}</div>
          </div>
        </div>
      `;
    })
    .join("");

  section.style.display = "block";
}

// ===== TRACK INTERACTION (for ranking algorithm) =====
function trackCatView(catId, type = "view") {
  try {
    const headers = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch(`${API_BASE}/cats/${catId}/track`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type }),
    }).catch(() => {});
  } catch {
    // Never block the user
  }
}
