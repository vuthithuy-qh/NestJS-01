// ===== STATE =====
let currentPage = 1;
let currentFilters = {};
let categories = [];

// ===== DOM ELEMENTS (sẽ gán sau khi header load xong) =====
let productGrid, pagination, categoryList;
let filterCategory, filterGender, filterSort;

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  // Load shared header & footer
  await loadSharedComponents();

  // Gán DOM elements
  productGrid = document.getElementById("productGrid");
  pagination = document.getElementById("pagination");
  categoryList = document.getElementById("categoryList");
  filterCategory = document.getElementById("filterCategory");
  filterGender = document.getElementById("filterGender");
  filterSort = document.getElementById("filterSort");

  // Load data
  loadCategories();
  loadCats();
  initSlider();
  initEventListeners();
});

// ===== LOAD CATEGORIES =====
async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    const result = await res.json();
    const data = result.data || result;

    categories = Array.isArray(data) ? data : [];

    categoryList.innerHTML = `
      <li class="active" data-id="">Tất cả giống mèo</li>
      ${categories.map((c) => `<li data-id="${c.id}">${c.name}</li>`).join("")}
    `;

    categories.forEach((c) => {
      filterCategory.add(new Option(c.name, c.id));
    });

    categoryList.querySelectorAll("li").forEach((li) => {
      li.addEventListener("click", () => {
        categoryList.querySelector(".active")?.classList.remove("active");
        li.classList.add("active");
        currentFilters.categoryId = li.dataset.id || undefined;
        currentPage = 1;
        loadCats();
      });
    });
  } catch (err) {
    console.error("Lỗi tải danh mục:", err);
    categoryList.innerHTML =
      '<li class="loading-text">Không tải được danh mục</li>';
  }
}

// ===== LOAD CATS =====
async function loadCats() {
  productGrid.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>Đang tải mèo cưng...</p>
    </div>
  `;

  try {
    let cats = [];
    let total = 0;
    let totalPages = 1;

    // Always use /cats endpoint with sortBy=rank as default
    const params = new URLSearchParams();
    params.set("page", currentPage);
    params.set("limit", 12);

    // Default to rank sort if no explicit sort is set
    const sortBy = currentFilters.sortBy || "rank";
    const sortOrder = currentFilters.sortOrder || "DESC";
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);

    if (currentFilters.categoryId)
      params.set("categoryId", currentFilters.categoryId);
    if (currentFilters.gender) params.set("gender", currentFilters.gender);
    if (currentFilters.search) params.set("search", currentFilters.search);
    if (currentFilters.status) params.set("status", currentFilters.status);
    if (currentFilters.maxPrice)
      params.set("maxPrice", currentFilters.maxPrice);

    const res = await fetch(`${API_BASE}/cats?${params.toString()}`);
    const result = await res.json();
    const responseData = result.data || result;

    if (Array.isArray(responseData)) {
      cats = responseData;
      total = cats.length;
    } else {
      cats = responseData.items || responseData.data || [];
      total = responseData.total || cats.length;
      totalPages = responseData.totalPages || Math.ceil(total / 12);
    }

    renderProducts(cats);
    renderPagination(totalPages);
  } catch (err) {
    console.error("Lỗi tải sản phẩm:", err);
    productGrid.innerHTML = `
      <div class="no-products">
        <div class="empty-icon">😿</div>
        <p>Không thể kết nối tới server.</p>
      </div>
    `;
  }
}

// ===== RENDER PRODUCTS =====
async function renderProducts(cats) {
  if (!cats || cats.length === 0) {
    productGrid.innerHTML = `
      <div class="no-products">
        <div class="empty-icon">🐱</div>
        <p>Không tìm thấy mèo nào.<br/>Thử thay đổi bộ lọc nhé!</p>
      </div>
    `;
    return;
  }

  // Fetch promotions cho tất cả categories xuất hiện
  const categoryIds = [
    ...new Set(cats.map((c) => c.categoryId).filter(Boolean)),
  ];
  const promoMap = {};
  await Promise.all(
    categoryIds.map(async (catId) => {
      const promos = await getActivePromotions(catId);
      promoMap[catId] = promos;
    }),
  );

  productGrid.innerHTML = cats
    .map((cat) => {
      let price = 0;
      if (cat.specs && cat.specs.length > 0) {
        const prices = cat.specs.map((s) => parseFloat(s.price));
        price = Math.min(...prices);
      }

      const imageUrl = getCatImageUrl(cat.image);

      const genderBadge =
        cat.gender === "male"
          ? '<span class="badge gender-male">♂ Đực</span>'
          : cat.gender === "female"
            ? '<span class="badge gender-female">♀ Cái</span>'
            : "";

      // Check stock: tổng qtyInStock của tất cả specs
      const totalStock = (cat.specs || []).reduce(
        (sum, s) => sum + (s.qtyInStock || 0),
        0,
      );

      let statusBadge;
      if (cat.status === "sold") {
        statusBadge =
          '<span class="badge status" style="background:var(--danger)">Đã bán</span>';
      } else if (cat.status === "reserved") {
        statusBadge =
          '<span class="badge status" style="background:var(--warning)">Đã đặt</span>';
      } else if (totalStock <= 0) {
        statusBadge =
          '<span class="badge status" style="background:var(--text-muted)">Hết hàng</span>';
      } else {
        statusBadge = '<span class="badge status">Có sẵn</span>';
      }

      const categoryName = cat.category?.name || "";

      // Tính giá có khuyến mãi
      const promotions = promoMap[cat.categoryId] || [];
      const bestPromo = price > 0 ? getBestPromotion(promotions, price) : null;
      const priceHtml =
        price > 0
          ? renderPriceHtml(price, bestPromo)
          : '<span class="price-current">Liên hệ</span>';

      return `
      <div class="product-card" onclick="viewDetail(${cat.id})">
        <div class="card-image">
          <img src="${imageUrl}" alt="${cat.name}" loading="lazy"
               onerror="this.src='https://placehold.co/300x300/f0faf4/52b788?text=🐱'" />
          ${bestPromo ? `<div class="card-promo-tag">${bestPromo.discountType === "percentage" ? `-${bestPromo.discountRate}%` : `Giảm ${formatPrice(bestPromo.discountAmount)}`}</div>` : ""}
        </div>
        <div class="card-badges">${statusBadge}${genderBadge}</div>
        <div class="card-info">
          <div class="cat-name">${cat.name}</div>
          <div class="cat-category">${categoryName}</div>
          <div class="cat-price">${priceHtml}</div>
        </div>
        <div class="card-actions">
          <button class="btn-detail" onclick="event.stopPropagation(); viewDetail(${cat.id})">Chi tiết</button>
          <button class="btn-cart" onclick="event.stopPropagation(); addToCart(${cat.id})">🛒 Thêm</button>
        </div>
      </div>
    `;
    })
    .join("");
}

// ===== RENDER PAGINATION =====
function renderPagination(totalPages) {
  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  let html = `<button ${currentPage === 1 ? "disabled" : ""} onclick="goToPage(${currentPage - 1})">❮</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    ) {
      html += `<button class="${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">${i}</button>`;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      html += `<button disabled>...</button>`;
    }
  }

  html += `<button ${currentPage === totalPages ? "disabled" : ""} onclick="goToPage(${currentPage + 1})">❯</button>`;
  pagination.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  loadCats();
  window.scrollTo({
    top: document.querySelector(".products-section").offsetTop - 80,
    behavior: "smooth",
  });
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
  filterCategory?.addEventListener("change", () => {
    currentFilters.categoryId = filterCategory.value || undefined;
    currentPage = 1;
    loadCats();
  });

  filterGender?.addEventListener("change", () => {
    currentFilters.gender = filterGender.value || undefined;
    currentPage = 1;
    loadCats();
  });

  filterSort?.addEventListener("change", () => {
    const [sortBy, sortOrder] = filterSort.value.split("-");
    currentFilters.sortBy = sortBy;
    currentFilters.sortOrder = sortOrder;
    currentPage = 1;
    loadCats();
  });

  // Search (from header)
  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");
  searchBtn?.addEventListener("click", performSearch);
  searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") performSearch();
  });

  // Quick categories
  document.querySelectorAll(".quick-cat-item").forEach((item) => {
    item.addEventListener("click", () => {
      document
        .querySelectorAll(".quick-cat-item")
        .forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      currentFilters = {};
      const key = item.dataset.filterKey;
      const value = item.dataset.filterValue;

      if (key === "sortBy") {
        currentFilters.sortBy = value;
        currentFilters.sortOrder = item.dataset.sortOrder || "DESC";
      } else {
        currentFilters[key] = value;
      }

      if (filterCategory) filterCategory.value = "";
      if (filterGender) filterGender.value = currentFilters.gender || "";
      if (filterSort)
        filterSort.value = currentFilters.sortBy
          ? `${currentFilters.sortBy}-${currentFilters.sortOrder}`
          : "rank-DESC";

      currentPage = 1;
      loadCats();
    });
  });
}

function performSearch() {
  const searchInput = document.getElementById("searchInput");
  currentFilters.search = searchInput?.value.trim() || undefined;
  currentPage = 1;
  loadCats();
}

// ===== ACTIONS =====
function viewDetail(catId) {
  // Track view interaction (fire-and-forget)
  trackCatInteraction(catId, "view");
  window.location.href = `../../cats/html/cat-detail.html?id=${catId}`;
}

function addToCart(catId) {
  if (!isLoggedIn()) {
    alert("Vui lòng đăng nhập để thêm vào giỏ hàng!");
    redirectToLogin();
    return;
  }
  // Track view interaction (fire-and-forget)
  trackCatInteraction(catId, "view");
  // Redirect to detail page so user can pick variant/spec
  window.location.href = `../../cats/html/cat-detail.html?id=${catId}`;
}

/**
 * Track a user interaction with a cat (view, cart_add, purchase).
 * Sends to backend fire-and-forget (don't block navigation).
 */
function trackCatInteraction(catId, type) {
  try {
    const headers = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch(`${API_BASE}/cats/${catId}/track`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type }),
    }).catch(() => {}); // Silently ignore errors
  } catch {
    // Never block the user flow
  }
}

// ===== SLIDER =====
function initSlider() {
  const slides = document.querySelectorAll(".slide");
  const dotsContainer = document.getElementById("sliderDots");
  let currentSlide = 0;
  let autoSlideInterval;

  if (slides.length === 0) return;

  slides.forEach((_, i) => {
    const dot = document.createElement("div");
    dot.classList.add("dot");
    if (i === 0) dot.classList.add("active");
    dot.addEventListener("click", () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });

  function goToSlide(index) {
    slides[currentSlide].classList.remove("active");
    dotsContainer.children[currentSlide]?.classList.remove("active");
    currentSlide = (index + slides.length) % slides.length;
    slides[currentSlide].classList.add("active");
    dotsContainer.children[currentSlide]?.classList.add("active");
  }

  function startAutoSlide() {
    autoSlideInterval = setInterval(() => goToSlide(currentSlide + 1), 4000);
  }

  document.getElementById("sliderPrev")?.addEventListener("click", () => {
    clearInterval(autoSlideInterval);
    goToSlide(currentSlide - 1);
    startAutoSlide();
  });

  document.getElementById("sliderNext")?.addEventListener("click", () => {
    clearInterval(autoSlideInterval);
    goToSlide(currentSlide + 1);
    startAutoSlide();
  });

  startAutoSlide();
}
