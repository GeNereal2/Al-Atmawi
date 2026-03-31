const STORAGE_KEYS = {
  companies: "atmawi_companies",
  products: "atmawi_products",
  admin: "atmawi_admin_credentials",
  session: "atmawi_admin_logged_in"
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

/* Auth */
const setupBox = document.getElementById("setupBox");
const loginBox = document.getElementById("loginBox");
const dashboardBox = document.getElementById("dashboardBox");

const setupForm = document.getElementById("setupForm");
const loginForm = document.getElementById("loginForm");
const credentialsForm = document.getElementById("credentialsForm");

const setupUsername = document.getElementById("setupUsername");
const setupPassword = document.getElementById("setupPassword");
const setupPasswordConfirm = document.getElementById("setupPasswordConfirm");

const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");

const newUsername = document.getElementById("newUsername");
const newPassword = document.getElementById("newPassword");
const confirmNewPassword = document.getElementById("confirmNewPassword");

const logoutBtn = document.getElementById("logoutBtn");
const adminDisplayName = document.getElementById("adminDisplayName");

/* Company */
const companyForm = document.getElementById("companyForm");
const companyIdInput = document.getElementById("companyId");
const companyNameInput = document.getElementById("companyName");
const companyDescInput = document.getElementById("companyDesc");
const companyImageInput = document.getElementById("companyImage");
const companyImageFileInput = document.getElementById("companyImageFile");
const companyImageDataInput = document.getElementById("companyImageData");
const companyPreview = document.getElementById("companyPreview");

const companyFormTitle = document.getElementById("companyFormTitle");
const companySubmitBtn = document.getElementById("companySubmitBtn");
const cancelCompanyEditBtn = document.getElementById("cancelCompanyEditBtn");
const adminCompaniesList = document.getElementById("adminCompaniesList");

/* Product */
const productForm = document.getElementById("productForm");
const productIdInput = document.getElementById("productId");
const productCompanyInput = document.getElementById("productCompany");
const productNameInput = document.getElementById("productName");
const productDescInput = document.getElementById("productDesc");
const productImageInput = document.getElementById("productImage");
const productImageFileInput = document.getElementById("productImageFile");
const productImageDataInput = document.getElementById("productImageData");
const productPreview = document.getElementById("productPreview");

const productFormTitle = document.getElementById("productFormTitle");
const productSubmitBtn = document.getElementById("productSubmitBtn");
const cancelProductEditBtn = document.getElementById("cancelProductEditBtn");
const adminProductsList = document.getElementById("adminProductsList");

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function showMessage(form, message, type = "success") {
  const oldMessage = form.querySelector(".success-message, .error-message");
  if (oldMessage) oldMessage.remove();

  const div = document.createElement("div");
  div.className = type === "success" ? "success-message" : "error-message";
  div.textContent = message;
  form.appendChild(div);

  setTimeout(() => {
    div.remove();
  }, 3000);
}

function saveCompanies(companies) {
  localStorage.setItem(STORAGE_KEYS.companies, JSON.stringify(companies));
}

function saveProducts(products) {
  localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
}

function seedDataIfNeeded() {
  const companiesStored = localStorage.getItem(STORAGE_KEYS.companies);
  const productsStored = localStorage.getItem(STORAGE_KEYS.products);

  if (!companiesStored) {
    const companies = [...defaultCompanies];
    saveCompanies(companies);

    const companyMap = Object.fromEntries(companies.map(company => [company.name, company.id]));
    const products = defaultProducts.map(product => {
      if (product.name.toLowerCase().includes("kinder")) {
        return { ...product, companyId: companyMap["Kinder"] };
      }
      if (product.name.toLowerCase().includes("nutella")) {
        return { ...product, companyId: companyMap["Nutella"] };
      }
      return { ...product, companyId: companyMap["Ferrero"] };
    });

    saveProducts(products);
  } else if (!productsStored) {
    saveProducts([]);
  }
}

function getCompanies() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.companies)) || [];
  } catch (_) {
    return [];
  }
}

function getProducts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.products)) || [];
  } catch (_) {
    return [];
  }
}

function getAdminCredentials() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.admin)) || null;
  } catch (_) {
    return null;
  }
}

function saveAdminCredentials(username, password) {
  localStorage.setItem(STORAGE_KEYS.admin, JSON.stringify({ username, password }));
}

function isLoggedIn() {
  return localStorage.getItem(STORAGE_KEYS.session) === "true";
}

function setLoggedIn(status) {
  localStorage.setItem(STORAGE_KEYS.session, status ? "true" : "false");
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("فشل في قراءة الصورة"));

    reader.readAsDataURL(file);
  });
}

async function handleImageSelection(fileInput, hiddenInput, previewElement) {
  const file = fileInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("الملف المختار ليس صورة");
    fileInput.value = "";
    return;
  }

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    alert("حجم الصورة كبير جدًا. اختر صورة أقل من 2MB");
    fileInput.value = "";
    return;
  }

  try {
    const dataUrl = await readFileAsDataURL(file);
    hiddenInput.value = dataUrl;
    previewElement.src = dataUrl;
    previewElement.classList.remove("hidden");
  } catch (error) {
    alert("حدث خطأ أثناء قراءة الصورة");
  }
}

function updatePreviewFromUrl(url, previewElement, hiddenInput) {
  const value = url.trim();
  if (!value) {
    if (!hiddenInput.value) {
      previewElement.src = "";
      previewElement.classList.add("hidden");
    }
    return;
  }

  previewElement.src = value;
  previewElement.classList.remove("hidden");
}

function resetCompanyForm() {
  companyForm.reset();
  companyIdInput.value = "";
  companyImageDataInput.value = "";
  companyPreview.src = "";
  companyPreview.classList.add("hidden");
  companyFormTitle.textContent = "إضافة شركة جديدة";
  companySubmitBtn.textContent = "إضافة الشركة";
  cancelCompanyEditBtn.classList.add("hidden");
}

function resetProductForm() {
  productForm.reset();
  productIdInput.value = "";
  productImageDataInput.value = "";
  productPreview.src = "";
  productPreview.classList.add("hidden");
  productFormTitle.textContent = "إضافة منتج جديد";
  productSubmitBtn.textContent = "إضافة المنتج";
  cancelProductEditBtn.classList.add("hidden");
}

function renderCompanyOptions() {
  const companies = getCompanies();

  if (!companies.length) {
    productCompanyInput.innerHTML = `<option value="">أضف شركة أولًا</option>`;
    return;
  }

  productCompanyInput.innerHTML = `
    <option value="">اختر الشركة</option>
    ${companies.map(company => `
      <option value="${company.id}">${escapeHtml(company.name)}</option>
    `).join("")}
  `;
}

function renderCompaniesList() {
  const companies = getCompanies();

  if (!companies.length) {
    adminCompaniesList.innerHTML = `<div class="empty-message">لا توجد شركات حاليًا</div>`;
    return;
  }

  adminCompaniesList.innerHTML = companies.map(company => {
    const companyProductsCount = getProducts().filter(
      product => String(product.companyId) === String(company.id)
    ).length;

    return `
      <div class="admin-item">
        <div class="admin-item-top">
          <div class="admin-item-image">
            <img src="${escapeHtml(company.image)}" alt="${escapeHtml(company.name)}">
          </div>
          <div>
            <h4>${escapeHtml(company.name)}</h4>
            <div class="admin-item-meta">عدد المنتجات: ${companyProductsCount}</div>
            <p>${escapeHtml(company.desc)}</p>
          </div>
        </div>
        <div class="admin-item-actions">
          <button class="action-btn edit-btn" data-company-edit="${company.id}">تعديل</button>
          <button class="action-btn delete-btn" data-company-delete="${company.id}">حذف</button>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll("[data-company-edit]").forEach(btn => {
    btn.addEventListener("click", () => startEditCompany(btn.dataset.companyEdit));
  });

  document.querySelectorAll("[data-company-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteCompany(btn.dataset.companyDelete));
  });
}

function renderProductsList() {
  const products = getProducts();
  const companies = getCompanies();

  if (!products.length) {
    adminProductsList.innerHTML = `<div class="empty-message">لا توجد منتجات حاليًا</div>`;
    return;
  }

  adminProductsList.innerHTML = products.map(product => {
    const company = companies.find(item => String(item.id) === String(product.companyId));

    return `
      <div class="admin-item">
        <div class="admin-item-top">
          <div class="admin-item-image">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
          </div>
          <div>
            <h4>${escapeHtml(product.name)}</h4>
            ${company ? `<div class="admin-item-meta">${escapeHtml(company.name)}</div>` : ""}
            <p>${escapeHtml(product.desc)}</p>
          </div>
        </div>
        <div class="admin-item-actions">
          <button class="action-btn edit-btn" data-product-edit="${product.id}">تعديل</button>
          <button class="action-btn delete-btn" data-product-delete="${product.id}">حذف</button>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll("[data-product-edit]").forEach(btn => {
    btn.addEventListener("click", () => startEditProduct(btn.dataset.productEdit));
  });

  document.querySelectorAll("[data-product-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteProduct(btn.dataset.productDelete));
  });
}

function renderDashboardData() {
  renderCompanyOptions();
  renderCompaniesList();
  renderProductsList();
}

function updateAdminUI() {
  const credentials = getAdminCredentials();
  const loggedIn = isLoggedIn();

  setupBox.classList.add("hidden");
  loginBox.classList.add("hidden");
  dashboardBox.classList.add("hidden");

  if (!credentials) {
    setupBox.classList.remove("hidden");
    return;
  }

  if (!loggedIn) {
    loginBox.classList.remove("hidden");
    return;
  }

  dashboardBox.classList.remove("hidden");
  adminDisplayName.textContent = credentials.username;
  newUsername.value = credentials.username;

  renderDashboardData();
}

function startEditCompany(companyId) {
  const company = getCompanies().find(item => String(item.id) === String(companyId));
  if (!company) return;

  companyIdInput.value = company.id;
  companyNameInput.value = company.name;
  companyDescInput.value = company.desc;
  companyImageInput.value = company.image.startsWith("data:") ? "" : company.image;
  companyImageDataInput.value = company.image.startsWith("data:") ? company.image : "";
  companyPreview.src = company.image;
  companyPreview.classList.remove("hidden");

  companyFormTitle.textContent = "تعديل الشركة";
  companySubmitBtn.textContent = "حفظ تعديل الشركة";
  cancelCompanyEditBtn.classList.remove("hidden");
  companyForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function startEditProduct(productId) {
  const product = getProducts().find(item => String(item.id) === String(productId));
  if (!product) return;

  renderCompanyOptions();
  productIdInput.value = product.id;
  productCompanyInput.value = product.companyId;
  productNameInput.value = product.name;
  productDescInput.value = product.desc;
  productImageInput.value = product.image.startsWith("data:") ? "" : product.image;
  productImageDataInput.value = product.image.startsWith("data:") ? product.image : "";
  productPreview.src = product.image;
  productPreview.classList.remove("hidden");

  productFormTitle.textContent = "تعديل المنتج";
  productSubmitBtn.textContent = "حفظ تعديل المنتج";
  cancelProductEditBtn.classList.remove("hidden");
  productForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function deleteCompany(companyId) {
  const companies = getCompanies();
  const company = companies.find(item => String(item.id) === String(companyId));
  if (!company) return;

  const confirmed = window.confirm(`سيتم حذف الشركة "${company.name}" مع كل منتجاتها. هل أنت متأكد؟`);
  if (!confirmed) return;

  const updatedCompanies = companies.filter(item => String(item.id) !== String(companyId));
  const updatedProducts = getProducts().filter(
    product => String(product.companyId) !== String(companyId)
  );

  saveCompanies(updatedCompanies);
  saveProducts(updatedProducts);

  if (String(companyIdInput.value) === String(companyId)) {
    resetCompanyForm();
  }

  if (String(productCompanyInput.value) === String(companyId)) {
    resetProductForm();
  }

  renderDashboardData();
}

function deleteProduct(productId) {
  const products = getProducts();
  const product = products.find(item => String(item.id) === String(productId));
  if (!product) return;

  const confirmed = window.confirm(`هل أنت متأكد من حذف المنتج "${product.name}"؟`);
  if (!confirmed) return;

  saveProducts(products.filter(item => String(item.id) !== String(productId)));

  if (String(productIdInput.value) === String(productId)) {
    resetProductForm();
  }

  renderProductsList();
}

/* Auth */
setupForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const username = setupUsername.value.trim();
  const password = setupPassword.value.trim();
  const confirmPassword = setupPasswordConfirm.value.trim();

  if (!username || !password || !confirmPassword) {
    showMessage(setupForm, "يرجى تعبئة جميع الحقول", "error");
    return;
  }

  if (password.length < 4) {
    showMessage(setupForm, "كلمة المرور لازم 4 أحرف على الأقل", "error");
    return;
  }

  if (password !== confirmPassword) {
    showMessage(setupForm, "كلمتا المرور غير متطابقتين", "error");
    return;
  }

  saveAdminCredentials(username, password);
  setLoggedIn(true);
  setupForm.reset();
  updateAdminUI();
});

loginForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();
  const credentials = getAdminCredentials();

  if (!credentials) {
    showMessage(loginForm, "لا يوجد حساب أدمن محفوظ", "error");
    return;
  }

  if (username === credentials.username && password === credentials.password) {
    setLoggedIn(true);
    loginForm.reset();
    updateAdminUI();
  } else {
    showMessage(loginForm, "اسم المستخدم أو كلمة المرور غير صحيحة", "error");
  }
});

logoutBtn.addEventListener("click", function () {
  setLoggedIn(false);
  updateAdminUI();
});

credentialsForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const username = newUsername.value.trim();
  const password = newPassword.value.trim();
  const confirmPassword = confirmNewPassword.value.trim();

  if (!username || !password || !confirmPassword) {
    showMessage(credentialsForm, "يرجى تعبئة جميع الحقول", "error");
    return;
  }

  if (password.length < 4) {
    showMessage(credentialsForm, "كلمة المرور لازم 4 أحرف على الأقل", "error");
    return;
  }

  if (password !== confirmPassword) {
    showMessage(credentialsForm, "كلمتا المرور غير متطابقتين", "error");
    return;
  }

  saveAdminCredentials(username, password);
  newPassword.value = "";
  confirmNewPassword.value = "";
  adminDisplayName.textContent = username;
  showMessage(credentialsForm, "تم تحديث بيانات الأدمن بنجاح", "success");
});

/* Image preview events */
companyImageFileInput.addEventListener("change", async () => {
  await handleImageSelection(companyImageFileInput, companyImageDataInput, companyPreview);
  companyImageInput.value = "";
});

productImageFileInput.addEventListener("change", async () => {
  await handleImageSelection(productImageFileInput, productImageDataInput, productPreview);
  productImageInput.value = "";
});

companyImageInput.addEventListener("input", () => {
  if (companyImageInput.value.trim()) {
    companyImageDataInput.value = "";
    companyImageFileInput.value = "";
  }
  updatePreviewFromUrl(companyImageInput.value, companyPreview, companyImageDataInput);
});

productImageInput.addEventListener("input", () => {
  if (productImageInput.value.trim()) {
    productImageDataInput.value = "";
    productImageFileInput.value = "";
  }
  updatePreviewFromUrl(productImageInput.value, productPreview, productImageDataInput);
});

/* Companies */
companyForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const id = companyIdInput.value.trim();
  const name = companyNameInput.value.trim();
  const desc = companyDescInput.value.trim();
  const image = companyImageDataInput.value.trim() || companyImageInput.value.trim();

  if (!name || !desc || !image) {
    showMessage(companyForm, "يرجى تعبئة اسم الشركة والوصف والصورة", "error");
    return;
  }

  const companies = getCompanies();
  const duplicate = companies.find(company =>
    company.name.trim().toLowerCase() === name.toLowerCase() &&
    String(company.id) !== String(id)
  );

  if (duplicate) {
    showMessage(companyForm, "يوجد شركة بنفس الاسم بالفعل", "error");
    return;
  }

  if (id) {
    const updated = companies.map(company =>
      String(company.id) === String(id)
        ? { ...company, name, desc, image }
        : company
    );
    saveCompanies(updated);
    showMessage(companyForm, "تم تعديل الشركة بنجاح", "success");
  } else {
    companies.push({
      id: generateId(),
      name,
      desc,
      image
    });
    saveCompanies(companies);
    showMessage(companyForm, "تمت إضافة الشركة بنجاح", "success");
  }

  resetCompanyForm();
  renderDashboardData();
});

cancelCompanyEditBtn.addEventListener("click", resetCompanyForm);

/* Products */
productForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const id = productIdInput.value.trim();
  const companyId = productCompanyInput.value.trim();
  const name = productNameInput.value.trim();
  const desc = productDescInput.value.trim();
  const image = productImageDataInput.value.trim() || productImageInput.value.trim();

  if (!companyId || !name || !desc || !image) {
    showMessage(productForm, "يرجى تعبئة جميع الحقول مع الصورة", "error");
    return;
  }

  const companyExists = getCompanies().some(company => String(company.id) === String(companyId));
  if (!companyExists) {
    showMessage(productForm, "الشركة المختارة غير موجودة", "error");
    return;
  }

  const products = getProducts();

  if (id) {
    const updated = products.map(product =>
      String(product.id) === String(id)
        ? { ...product, companyId, name, desc, image }
        : product
    );
    saveProducts(updated);
    showMessage(productForm, "تم تعديل المنتج بنجاح", "success");
  } else {
    products.push({
      id: generateId(),
      companyId,
      name,
      desc,
      image
    });
    saveProducts(products);
    showMessage(productForm, "تمت إضافة المنتج بنجاح", "success");
  }

  resetProductForm();
  renderProductsList();
  renderCompaniesList();
});

cancelProductEditBtn.addEventListener("click", resetProductForm);

/* Init */
seedDataIfNeeded();
renderCompanyOptions();
updateAdminUI();