import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy
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
const VIEWER_ADMIN = "mohammedahmad@gmail.com";

let currentUser = null;
let activeCompanyId = "all";
let companies = [];
let products = [];

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

function renderBrands() {
  if (!companies.length) {
    brandsGrid.innerHTML = `<div class="empty-message">لا توجد شركات حاليًا</div>`;
    return;
  }

  brandsGrid.innerHTML = companies.map(company => `
    <div class="card">
      <div class="card-image">
        <img src="${escapeHtml(company.image)}" alt="${escapeHtml(company.name)}">
      </div>
      <div class="card-body">
        <h3>${escapeHtml(company.name)}</h3>
        <div class="card-actions">
          <button class="btn btn-primary browse-company-btn" data-company-id="${company.id}">
            تصفح منتجات الشركة
          </button>
        </div>
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".browse-company-btn").forEach(button => {
    button.addEventListener("click", () => {
      setActiveCompany(button.dataset.companyId);
      document.getElementById("products").scrollIntoView({ behavior: "smooth" });
    });
  });
}

function renderFilters() {
  if (!companies.length) {
    filtersBar.innerHTML = "";
    return;
  }

  filtersBar.innerHTML = `
    <button class="filter-btn ${activeCompanyId === "all" ? "active" : ""}" data-company-id="all">كل المنتجات</button>
    ${companies.map(company => `
      <button class="filter-btn ${String(activeCompanyId) === String(company.id) ? "active" : ""}" data-company-id="${company.id}">
        ${escapeHtml(company.name)}
      </button>
    `).join("")}
  `;

  document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
      setActiveCompany(button.dataset.companyId);
    });
  });
}

function renderProducts() {
  let filteredProducts = products;
  let subtitle = "استعرض جميع منتجاتنا أو اختر شركة معينة";
  let title = "المنتجات";

  if (activeCompanyId !== "all") {
    filteredProducts = products.filter(
      product => String(product.companyId) === String(activeCompanyId)
    );

    const selectedCompany = companies.find(
      company => String(company.id) === String(activeCompanyId)
    );

    if (selectedCompany) {
      title = `منتجات ${selectedCompany.name}`;
      subtitle = `استعرض المنتجات الخاصة بشركة ${selectedCompany.name}`;
    }
  }

  productsSectionTitle.textContent = title;
  productsSectionSubtitle.textContent = subtitle;

  if (!filteredProducts.length) {
    productsGrid.innerHTML = `<div class="empty-message">لا توجد منتجات ضمن هذا التصنيف حاليًا</div>`;
    return;
  }

  const showPrices = canSeePrices(currentUser);

  productsGrid.innerHTML = filteredProducts.map(product => {
    const company = getCompanyById(product.companyId);

    return `
      <div class="product-card">
        <div class="product-image">
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
        </div>
        <div class="product-content">
          ${company ? `<span class="brand-badge">${escapeHtml(company.name)}</span>` : ""}
          <h4>${escapeHtml(product.name)}</h4>
          ${showPrices ? `<p>${escapeHtml(product.desc)}</p>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

function setActiveCompany(companyId) {
  activeCompanyId = companyId;
  renderFilters();
  renderProducts();
}

function validateActiveCompany() {
  if (
    activeCompanyId !== "all" &&
    !companies.some(company => String(company.id) === String(activeCompanyId))
  ) {
    activeCompanyId = "all";
  }
}

function renderAll() {
  validateActiveCompany();
  renderBrands();
  renderFilters();
  renderProducts();
}

function listenToCompanies() {
  const companiesQuery = query(collection(db, "companies"), orderBy("createdAt", "desc"));

  onSnapshot(companiesQuery, (snapshot) => {
    companies = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    renderAll();
  });
}

function listenToProducts() {
  const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));

  onSnapshot(productsQuery, (snapshot) => {
    products = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    renderAll();
  });
}

function init() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    renderAll();
  });

  listenToCompanies();
  listenToProducts();
}

init();