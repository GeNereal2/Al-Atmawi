const STORAGE_KEYS = {
  companies: "atmawi_companies",
  products: "atmawi_products"
};

function generateId() {
  return Date.now() + Math.floor(Math.random() * 100000);
}

const defaultCompanies = [
  {
    id: generateId(),
    name: "Haribo",
    desc: "سكاكر جيلاتينية بنكهات وأشكال مرحة تناسب الجميع.",
    image: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: generateId(),
    name: "Ferrero",
    desc: "تشكيلة فاخرة من الشوكولاتة المناسبة للهدايا والمناسبات.",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: generateId(),
    name: "Nutella",
    desc: "نكهة البندق والشوكولاتة لمحبي المذاق الكريمي.",
    image: "https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: generateId(),
    name: "Kinder",
    desc: "منتجات لذيذة ومحبوبة للأطفال والكبار.",
    image: "https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=900&q=80"
  }
];

const defaultProducts = [
  {
    id: generateId(),
    companyId: null,
    name: "Kinder Bueno",
    desc: "ويفر مقرمش محشو بكريمة البندق.",
    image: "https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: generateId(),
    companyId: null,
    name: "Nutella Jar",
    desc: "شوكولاتة بالبندق بطعم غني.",
    image: "https://images.unsplash.com/photo-1633934542430-0905ccb5f050?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: generateId(),
    companyId: null,
    name: "Ferrero Rocher",
    desc: "شوكولاتة فاخرة مناسبة للهدايا والمناسبات.",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80"
  }
];

let activeCompanyId = "all";

const brandsGrid = document.getElementById("brandsGrid");
const filtersBar = document.getElementById("filtersBar");
const productsGrid = document.getElementById("productsGrid");
const productsSectionTitle = document.getElementById("productsSectionTitle");
const productsSectionSubtitle = document.getElementById("productsSectionSubtitle");

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function saveCompanies(companies) {
  localStorage.setItem(STORAGE_KEYS.companies, JSON.stringify(companies));
}

function saveProducts(products) {
  localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
}

function getCompanies() {
  const stored = localStorage.getItem(STORAGE_KEYS.companies);

  if (stored) {
    try {
      const companies = JSON.parse(stored);
      if (Array.isArray(companies) && companies.length) return companies;
    } catch (_) {}
  }

  const seededCompanies = [...defaultCompanies];
  saveCompanies(seededCompanies);

  const companyMap = Object.fromEntries(seededCompanies.map(company => [company.name, company.id]));
  const seededProducts = defaultProducts.map(product => {
    if (product.name.toLowerCase().includes("kinder")) {
      return { ...product, companyId: companyMap["Kinder"] };
    }
    if (product.name.toLowerCase().includes("nutella")) {
      return { ...product, companyId: companyMap["Nutella"] };
    }
    return { ...product, companyId: companyMap["Ferrero"] };
  });

  saveProducts(seededProducts);
  return seededCompanies;
}

function getProducts() {
  const stored = localStorage.getItem(STORAGE_KEYS.products);

  if (stored) {
    try {
      const products = JSON.parse(stored);
      if (Array.isArray(products)) return products;
    } catch (_) {}
  }

  getCompanies();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.products)) || [];
}

function getCompanyById(companyId) {
  return getCompanies().find(company => String(company.id) === String(companyId));
}

function renderBrands() {
  const companies = getCompanies();

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
        <p>${escapeHtml(company.desc)}</p>
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
      const companyId = button.dataset.companyId;
      setActiveCompany(companyId);
      document.getElementById("products").scrollIntoView({ behavior: "smooth" });
    });
  });
}

function renderFilters() {
  const companies = getCompanies();

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
  const products = getProducts();
  const companies = getCompanies();

  let filteredProducts = products;
  let subtitle = "استعرض جميع منتجاتنا أو اختر شركة معينة";
  let title = "المنتجات";

  if (activeCompanyId !== "all") {
    filteredProducts = products.filter(product => String(product.companyId) === String(activeCompanyId));
    const selectedCompany = companies.find(company => String(company.id) === String(activeCompanyId));

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
          <p>${escapeHtml(product.desc)}</p>
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

function init() {
  renderBrands();
  renderFilters();
  renderProducts();
}

init();