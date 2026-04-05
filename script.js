import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  limit,
  startAfter
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAoxZQ96uziaGETAEWH0BONmgPPUoa-wD8",
  authDomain: "al-atmawi.firebaseapp.com",
  projectId: "al-atmawi",
  storageBucket: "al-atmawi.firebasestorage.app",
  messagingSenderId: "420901103119",
  appId: "1:420901103119:web:608f401260a3f8d532257a",
  measurementId: "G-ZTJ7M3GB8Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const OWNER_ADMIN = "alimohey586@gmail.com";
const VIEWER_ADMIN = "private@gmail.com";
const PRODUCTS_PAGE_SIZE = 12;
const BRANDS_PAGE_SIZE = 6;

let currentUser = null;
let activeCompanyId = "";
let companies = [];
let visibleProducts = [];
let isLoadingProducts = false;
let hasMoreProducts = false;
let currentCompanyProductsDocs = [];
let currentCompanyCursor = 0;
let visibleBrandsCount = BRANDS_PAGE_SIZE;

/* ===== Modal ===== */
const productModal = document.getElementById("productModal");
const modalImg = document.getElementById("modalImg");
const modalName = document.getElementById("modalName");
const modalDesc = document.getElementById("modalDesc");
const modalBadge = document.getElementById("modalBadge");
const modalCloseBtn = document.getElementById("modalCloseBtn");

function openModal(product, company) {
  modalImg.src = product.image || "";
  modalImg.alt = product.name || "";
  modalName.textContent = product.name || "";
  modalBadge.textContent = company ? company.name : "";
  if (product.desc && canSeePrices(currentUser)) {
    modalDesc.textContent = product.desc;
    modalDesc.style.display = "block";
  } else {
    modalDesc.style.display = "none";
  }
  productModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  productModal.classList.remove("active");
  document.body.style.overflow = "";
}

modalCloseBtn.addEventListener("click", closeModal);
productModal.addEventListener("click", (e) => {
  if (e.target === productModal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

const brandsGrid = document.getElementById("brandsGrid");
const filtersBar = document.getElementById("filtersBar");
const productsGrid = document.getElementById("productsGrid");
const productsSectionTitle = document.getElementById("productsSectionTitle");
const productsSectionSubtitle = document.getElementById("productsSectionSubtitle");

function canSeePrices(user) {
  if (!user || !user.email) return false;
  const email = user.email.toLowerCase();
  return email === OWNER_ADMIN || email === VIEWER_ADMIN;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function getCompanyById(companyId) {
  return companies.find(company => String(company.id) === String(companyId));
}

function sortProductsByCreatedAt(items) {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });
}

/* ===== Skeleton Loaders ===== */
function getBrandSkeletons(count = 6) {
  return Array.from({ length: count }, () => `
    <div class="card skeleton-card">
      <div class="skeleton-image"></div>
      <div class="skeleton-body">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-btn"></div>
      </div>
    </div>
  `).join("");
}

function getProductSkeletons(count = 8) {
  return Array.from({ length: count }, () => `
    <div class="product-card skeleton-card">
      <div class="skeleton-product-image"></div>
      <div class="skeleton-body">
        <div class="skeleton-line skeleton-badge"></div>
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-desc"></div>
      </div>
    </div>
  `).join("");
}

/* ===== Animate cards on appear ===== */
function animateCards(selector) {
  const cards = document.querySelectorAll(selector);
  cards.forEach((card, i) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    card.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    card.style.transitionDelay = `${i * 60}ms`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      });
    });
  });
}

/* ===== Render Brands ===== */
function renderBrands() {
  if (!companies.length) {
    brandsGrid.innerHTML = `<div class="empty-message">لا توجد شركات حاليًا</div>`;
    return;
  }

  const visibleCompanies = companies.slice(0, visibleBrandsCount);
  const hasMore = visibleBrandsCount < companies.length;

  brandsGrid.innerHTML = visibleCompanies.map(company => `
    <div class="card">
      <div class="card-image">
        <img
          src="${escapeHtml(company.image || "")}"
          alt="${escapeHtml(company.name)}"
          loading="lazy"
          decoding="async"
        >
      </div>
      <div class="card-body">
        <h3>${escapeHtml(company.name)}</h3>
        <div class="card-actions">
          <button class="btn btn-brand browse-company-btn" data-company-id="${company.id}">
            تصفح المنتجات
          </button>
        </div>
      </div>
    </div>
  `).join("");

  if (hasMore) {
    brandsGrid.innerHTML += `
      <div class="load-more-wrap" style="grid-column:1/-1">
        <button id="loadMoreBrandsBtn" class="btn btn-outline" type="button">عرض المزيد</button>
      </div>
    `;
    document.getElementById("loadMoreBrandsBtn").addEventListener("click", () => {
      visibleBrandsCount += BRANDS_PAGE_SIZE;
      renderBrands();
    });
  }

  animateCards(".card:not(.skeleton-card)");

  document.querySelectorAll(".browse-company-btn").forEach(button => {
    button.addEventListener("click", async () => {
      await setActiveCompany(button.dataset.companyId);
      document.getElementById("products").scrollIntoView({ behavior: "smooth" });
    });
  });
}

function renderFilters() {
  if (!companies.length) {
    filtersBar.innerHTML = "";
    return;
  }

  filtersBar.innerHTML = companies.map(company => `
    <button
      class="filter-btn ${String(activeCompanyId) === String(company.id) ? "active" : ""}"
      data-company-id="${company.id}"
      type="button"
    >
      ${escapeHtml(company.name)}
    </button>
  `).join("");

  document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", async () => {
      await setActiveCompany(button.dataset.companyId);
    });
  });
}

function getLoadMoreButtonHtml() {
  if (!visibleProducts.length || !hasMoreProducts) return "";
  return `
    <div class="load-more-wrap">
      <button id="loadMoreBtn" class="btn btn-outline" type="button" ${isLoadingProducts ? "disabled" : ""}>
        ${isLoadingProducts ? "جاري التحميل..." : "عرض المزيد"}
      </button>
    </div>
  `;
}

function renderProducts() {
  const selectedCompany = getCompanyById(activeCompanyId);

  let title = "المنتجات";
  let subtitle = "اختر شركة لعرض منتجاتها";

  if (selectedCompany) {
    title = `منتجات ${selectedCompany.name}`;
    subtitle = `استعرض المنتجات الخاصة بشركة ${selectedCompany.name}`;
  }

  productsSectionTitle.textContent = title;
  productsSectionSubtitle.textContent = subtitle;

  if (!selectedCompany && !isLoadingProducts) {
    productsGrid.innerHTML = `<div class="empty-message">اختر شركة لعرض منتجاتها</div>`;
    return;
  }

  if (!visibleProducts.length && isLoadingProducts) {
    productsGrid.innerHTML = getProductSkeletons(8);
    return;
  }

  if (!visibleProducts.length) {
    productsGrid.innerHTML = `<div class="empty-message">لا توجد منتجات لهذه الشركة حاليًا</div>`;
    return;
  }

  const showPrices = canSeePrices(currentUser);

  productsGrid.innerHTML = `
    ${visibleProducts.map(product => {
      const company = getCompanyById(product.companyId);
      return `
        <div class="product-card product-card-clickable" data-product-id="${product.id}">
          <div class="product-image">
            <img
              src="${escapeHtml(product.image || "")}"
              alt="${escapeHtml(product.name)}"
              loading="lazy"
              decoding="async"
            >
          </div>
          <div class="product-content">
            ${company ? `<span class="brand-badge">${escapeHtml(company.name)}</span>` : ""}
            <h4>${escapeHtml(product.name)}</h4>
            ${showPrices ? `<p>${escapeHtml(product.desc || "")}</p>` : ""}
          </div>
        </div>
      `;
    }).join("")}
    ${getLoadMoreButtonHtml()}
  `;

  animateCards(".product-card:not(.skeleton-card)");

  document.querySelectorAll(".product-card-clickable").forEach(card => {
    card.addEventListener("click", () => {
      const productId = card.dataset.productId;
      const product = visibleProducts.find(p => p.id === productId);
      if (!product) return;
      const company = getCompanyById(product.companyId);
      openModal(product, company);
    });
  });

  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadMoreProducts);
  }
}

async function loadCompanies() {
  brandsGrid.innerHTML = getBrandSkeletons(6);

  try {
    const snapshot = await getDocs(collection(db, "companies"));

    companies = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    companies = sortProductsByCreatedAt(companies);

    renderBrands();
    renderFilters();

    if (companies.length) {
      await setActiveCompany(companies[0].id);
    } else {
      renderProducts();
    }
  } catch (error) {
    console.error(error);
    brandsGrid.innerHTML = `<div class="empty-message">حدث خطأ أثناء تحميل الشركات</div>`;
    filtersBar.innerHTML = "";
    productsGrid.innerHTML = `<div class="empty-message">حدث خطأ أثناء تحميل المنتجات</div>`;
  }
}

async function loadInitialProducts(companyId) {
  if (!companyId) {
    visibleProducts = [];
    hasMoreProducts = false;
    currentCompanyProductsDocs = [];
    currentCompanyCursor = 0;
    renderProducts();
    return;
  }

  isLoadingProducts = true;
  visibleProducts = [];
  hasMoreProducts = false;
  currentCompanyProductsDocs = [];
  currentCompanyCursor = 0;
  renderProducts();

  try {
    const productsQuery = query(
      collection(db, "products"),
      where("companyId", "==", companyId)
    );

    const snapshot = await getDocs(productsQuery);

    const loadedProducts = sortProductsByCreatedAt(
      snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
    );

    currentCompanyProductsDocs = loadedProducts;
    visibleProducts = loadedProducts.slice(0, PRODUCTS_PAGE_SIZE);
    currentCompanyCursor = visibleProducts.length;
    hasMoreProducts = currentCompanyCursor < currentCompanyProductsDocs.length;
  } catch (error) {
    console.error(error);
    visibleProducts = [];
    currentCompanyProductsDocs = [];
    currentCompanyCursor = 0;
    hasMoreProducts = false;
    productsGrid.innerHTML = `<div class="empty-message">حدث خطأ أثناء تحميل المنتجات</div>`;
  } finally {
    isLoadingProducts = false;
    renderProducts();
  }
}

async function loadMoreProducts() {
  if (isLoadingProducts || !hasMoreProducts) return;

  isLoadingProducts = true;
  renderProducts();

  try {
    const nextChunk = currentCompanyProductsDocs.slice(
      currentCompanyCursor,
      currentCompanyCursor + PRODUCTS_PAGE_SIZE
    );

    visibleProducts = [...visibleProducts, ...nextChunk];
    currentCompanyCursor = visibleProducts.length;
    hasMoreProducts = currentCompanyCursor < currentCompanyProductsDocs.length;
  } catch (error) {
    console.error(error);
  } finally {
    isLoadingProducts = false;
    renderProducts();
  }
}

async function setActiveCompany(companyId) {
  activeCompanyId = companyId;
  renderFilters();
  await loadInitialProducts(companyId);
}

function rerenderProductsForAuthChange() {
  renderProducts();
}

async function init() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    rerenderProductsForAuthChange();
  });

  await loadCompanies();
}

init();
