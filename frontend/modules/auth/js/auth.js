// ===== AUTH MODULE =====
// API_BASE, getToken, isLoggedIn... đã có trong shared/js/config.js

const AUTH_API = `${API_BASE}/auth`;

// ========================
// DOM Elements cho địa chỉ
// ========================
const provinceSelect = document.getElementById("province");
const districtSelect = document.getElementById("district");
const wardSelect = document.getElementById("ward");

// ===================================
// LOGIC GỌI API ĐỊA CHỈ (Provinces)
// ===================================
if (provinceSelect) {
  fetch("https://provinces.open-api.vn/api/?depth=1")
    .then((res) => res.json())
    .then((data) => {
      data.forEach((p) => {
        provinceSelect.add(new Option(p.name, p.code));
      });
    })
    .catch((err) => console.error("Lỗi tải tỉnh/thành:", err));

  provinceSelect.addEventListener("change", async () => {
    districtSelect.innerHTML = '<option value="">Chọn Quận/Huyện</option>';
    wardSelect.innerHTML = '<option value="">Chọn Phường/Xã</option>';
    if (!provinceSelect.value) return;

    try {
      const res = await fetch(
        `https://provinces.open-api.vn/api/p/${provinceSelect.value}?depth=2`,
      );
      const data = await res.json();
      data.districts.forEach((d) => {
        districtSelect.add(new Option(d.name, d.code));
      });
    } catch (err) {
      console.error("Lỗi tải quận/huyện:", err);
    }
  });

  districtSelect.addEventListener("change", async () => {
    wardSelect.innerHTML = '<option value="">Chọn Phường/Xã</option>';
    if (!districtSelect.value) return;

    try {
      const res = await fetch(
        `https://provinces.open-api.vn/api/d/${districtSelect.value}?depth=2`,
      );
      const data = await res.json();
      data.wards.forEach((w) => {
        wardSelect.add(new Option(w.name, w.code));
      });
    } catch (err) {
      console.error("Lỗi tải phường/xã:", err);
    }
  });
}

// ===============
// XỬ LÝ ĐĂNG KÝ
// ===============
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const provinceName = provinceSelect?.selectedOptions[0]?.text || "";
    const districtName = districtSelect?.selectedOptions[0]?.text || "";
    const wardName = wardSelect?.selectedOptions[0]?.text || "";
    const detailAddress = document.getElementById("detailAddress")?.value || "";

    const fullAddress = [detailAddress, wardName, districtName, provinceName]
      .filter(Boolean)
      .join(", ");

    const payload = {
      email: document.getElementById("email").value,
      password: document.getElementById("password").value,
      fullName: document.getElementById("fullName").value,
      phone: document.getElementById("phone").value,
      address: fullAddress,
    };

    try {
      const response = await fetch(`${AUTH_API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        alert("Đăng ký thành công!");
        window.location.href = "login.html"; // ← Cùng thư mục auth/
      } else {
        const errorMsg = Array.isArray(result.message)
          ? result.message.join("\n")
          : result.message;
        alert("Lỗi: " + errorMsg);
      }
    } catch (error) {
      console.error("Lỗi kết nối:", error);
      alert("Không thể kết nối tới Server!");
    }
  });
}

// =================
// XỬ LÝ ĐĂNG NHẬP
// =================
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  // Lấy returnUrl từ query string (nếu có)
  const urlParams = new URLSearchParams(window.location.search);
  const returnUrl = urlParams.get("returnUrl");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      email: document.getElementById("loginEmail").value,
      password: document.getElementById("loginPassword").value,
    };

    try {
      const response = await fetch(`${AUTH_API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        // Lưu token + thông tin user
        localStorage.setItem("accessToken", result.data.accessToken);
        if (result.data.refreshToken) {
          localStorage.setItem("refreshToken", result.data.refreshToken);
        }
        if (result.data.user) {
          localStorage.setItem("user", JSON.stringify(result.data.user));
        }

        alert("Đăng nhập thành công!");

        // Redirect về trang trước đó hoặc home
        if (returnUrl) {
          window.location.href = decodeURIComponent(returnUrl);
        } else {
          window.location.href = "../../home/html/home.html";
        }
      } else {
        const errorMsg = Array.isArray(result.message)
          ? result.message.join("\n")
          : result.message;
        alert("Lỗi: " + errorMsg);
      }
    } catch (error) {
      console.error("Lỗi kết nối:", error);
      alert("Không thể kết nối tới Server!");
    }
  });
}
