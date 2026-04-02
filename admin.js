import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* =========================
   Firebase Config
========================= */
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

/* =========================
   Roles
========================= */
const OWNER_ADMIN = "alimohey586@gmail.com";
const VIEWER_ADMIN = "private@gmail.com";

function getUserRole(user) {
  if (!user || !user.email) return null;

  const email = user.email.toLowerCase();

  if (email === OWNER_ADMIN) return "owner";
  if (email === VIEWER_ADMIN) return "viewer";

  return null;
}

function isOwner(user) {
  return getUserRole(user) === "owner";
}

function isViewer(user) {
  return getUserRole(user) === "viewer";
}

function isAllowedAdmin(user) {
  return isOwner(user) || isViewer(user);
}

let companies = [];
let products = [];
let unsubscribeCompanies = null;
let unsubscribeProducts = null;

/* Auth */
const loginBox = document.getElementById("loginBox");
const dashboardBox = document.getElementById("dashboardBox");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const logoutBtn = document.getElementById("logoutBtn");
const adminDisplayName = document.getElementById("adminDisplayName");
const adminRoleLabel = document.getElementById("adminRoleLabel");

/* Company */
const companyFormCard = document.getElementById("companyFormCard");
const companyForm = document.getElementById("companyForm");
const companyIdInput = document.getElementById("companyId");
const companyNameInput = document.getElementById("companyName");
const companyImageInput = document.getElementById("companyImage");
const companyImageFileInput = document.getElementById("companyImageFile");
const companyImageDataInput = document.getElementById("companyImageData");
const companyPreview = document.getElementById("companyPreview");
const companyFormTitle = document.getElementById("companyFormTitle");
const companySubmitBtn = document.getElementById("companySubmitBtn");
const cancelCompanyEditBtn = document.getElementById("cancelCompanyEditBtn");
const adminCompaniesList = document.getElementById("adminCompaniesList");

/* Product */
const productFormCard = document.getElementById("productFormCard");
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

  setTimeout(() => div.remove(), 4000);
}

function stopListeners() {
  if (unsubscribeCompanies) {
    unsubscribeCompanies();
    unsubscribeCompanies = null;
  }

  if (unsubscribeProducts) {
    unsubscribeProducts();
    unsubscribeProducts = null;
  }
}

/* =========================
   Image Compression
========================= */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("فشل في قراءة الصورة"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("فشل في تحميل الصورة"));
    img.src = src;
  });
}

async function compressImageFile(file, options = {}) {
  const {
    maxWidth = 1400,
    maxHeight = 1400,
    quality = 0.82,
    outputType = "image/jpeg",
    maxBase64Length = 850000
  } = options;

  const originalDataUrl = await readFileAsDataURL(file);
  const img = await loadImage(originalDataUrl);

  let width = img.width;
  let height = img.height;

  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let currentQuality = quality;
  let result = canvas.toDataURL(outputType, currentQuality);

  while (result.length > maxBase64Length && currentQuality > 0.45) {
    currentQuality -= 0.07;
    result = canvas.toDataURL(outputType, currentQuality);
  }

  if (result.length > maxBase64Length) {
    let scaledWidth = width;
    let scaledHeight = height;

    while (result.length > maxBase64Length && scaledWidth > 500 && scaledHeight > 500) {
      scaledWidth = Math.round(scaledWidth * 0.9);
      scaledHeight = Math.round(scaledHeight * 0.9);

      canvas = document.createElement("canvas");
      ctx = canvas.getContext("2d");
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, scaledWidth, scaledHeight);
      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

      result = canvas.toDataURL(outputType, currentQuality);
    }
  }

  if (result.length > maxBase64Length) {
    throw new Error("الصورة كبيرة جدًا حتى بعد الضغط. اختر صورة بحجم أقل.");
  }

  return result;
}

async function handleImageSelection(fileInput, hiddenInput, previewElement) {
  const file = fileInput.files[0];
  if (!file) return;

  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    alert("صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WEBP");
    fileInput.value = "";
    return;
  }

  try {
    previewElement.src = "";
    previewElement.classList.add("hidden");

    const compressedDataUrl = await compressImageFile(file, {
      maxWidth: 1400,
      maxHeight: 1400,
      quality: 0.82,
      outputType: "image/jpeg",
      maxBase64Length: 850000
    });

    hiddenInput.value = compressedDataUrl;
    previewElement.src = compressedDataUrl;
    previewElement.classList.remove("hidden");
  } catch (error) {
    alert(error.message || "حدث خطأ أثناء تجهيز الصورة");
    fileInput.value = "";
    hiddenInput.value = "";
    previewElement.src = "";
    previewElement.classList.add("hidden");
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

function applyPermissionsUI(user) {
  if (isOwner(user)) {
    adminRoleLabel.textContent = "صلاحيتك: أدمن كامل";
    companyFormCard.classList.remove("hidden");
    productFormCard.classList.remove("hidden");
    return;
  }

  if (isViewer(user)) {
    adminRoleLabel.textContent = "صلاحيتك: مشاهدة الأسعار فقط";
    companyFormCard.classList.add("hidden");
    productFormCard.classList.add("hidden");
    return;
  }

  adminRoleLabel.textContent = "";
  companyFormCard.classList.add("hidden");
  productFormCard.classList.add("hidden");
}

function renderCompanyOptions() {
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
  if (!companies.length) {
    adminCompaniesList.innerHTML = `<div class="empty-message">لا توجد شركات حاليًا</div>`;
    return;
  }

  adminCompaniesList.innerHTML = companies.map(company => {
    const companyProductsCount = products.filter(
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
          </div>
        </div>

        ${isOwner(auth.currentUser) ? `
          <div class="admin-item-actions">
            <button class="action-btn edit-btn" data-company-edit="${company.id}">تعديل</button>
            <button class="action-btn delete-btn" data-company-delete="${company.id}">حذف</button>
          </div>
        ` : ""}
      </div>
    `;
  }).join("");

  if (isOwner(auth.currentUser)) {
    document.querySelectorAll("[data-company-edit]").forEach(btn => {
      btn.addEventListener("click", () => startEditCompany(btn.dataset.companyEdit));
    });

    document.querySelectorAll("[data-company-delete]").forEach(btn => {
      btn.addEventListener("click", () => deleteCompany(btn.dataset.companyDelete));
    });
  }
}

function renderProductsList() {
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

        ${isOwner(auth.currentUser) ? `
          <div class="admin-item-actions">
            <button class="action-btn edit-btn" data-product-edit="${product.id}">تعديل</button>
            <button class="action-btn delete-btn" data-product-delete="${product.id}">حذف</button>
          </div>
        ` : ""}
      </div>
    `;
  }).join("");

  if (isOwner(auth.currentUser)) {
    document.querySelectorAll("[data-product-edit]").forEach(btn => {
      btn.addEventListener("click", () => startEditProduct(btn.dataset.productEdit));
    });

    document.querySelectorAll("[data-product-delete]").forEach(btn => {
      btn.addEventListener("click", () => deleteProduct(btn.dataset.productDelete));
    });
  }
}

function renderDashboardData() {
  renderCompanyOptions();
  renderCompaniesList();
  renderProductsList();
}

function updateAdminUI(user) {
  loginBox.classList.add("hidden");
  dashboardBox.classList.add("hidden");

  if (!user) {
    loginBox.classList.remove("hidden");
    return;
  }

  if (!isAllowedAdmin(user)) {
    loginBox.classList.remove("hidden");
    showMessage(loginForm, "هذا الحساب غير مصرح له بدخول لوحة الأدمن", "error");
    signOut(auth);
    return;
  }

  dashboardBox.classList.remove("hidden");
  adminDisplayName.textContent = user.email || "Admin";
  applyPermissionsUI(user);
  renderDashboardData();
}

function startEditCompany(companyId) {
  if (!isOwner(auth.currentUser)) return;

  const company = companies.find(item => String(item.id) === String(companyId));
  if (!company) return;

  companyIdInput.value = company.id;
  companyNameInput.value = company.name;
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
  if (!isOwner(auth.currentUser)) return;

  const product = products.find(item => String(item.id) === String(productId));
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

async function deleteCompany(companyId) {
  if (!isOwner(auth.currentUser)) {
    alert("ليس لديك صلاحية لحذف الشركات");
    return;
  }

  const company = companies.find(item => String(item.id) === String(companyId));
  if (!company) return;

  const confirmed = window.confirm(`سيتم حذف الشركة "${company.name}" مع كل منتجاتها. هل أنت متأكد؟`);
  if (!confirmed) return;

  const relatedProducts = products.filter(
    product => String(product.companyId) === String(companyId)
  );

  try {
    for (const product of relatedProducts) {
      await deleteDoc(doc(db, "products", product.id));
    }

    await deleteDoc(doc(db, "companies", companyId));

    if (String(companyIdInput.value) === String(companyId)) resetCompanyForm();
    if (String(productCompanyInput.value) === String(companyId)) resetProductForm();
  } catch {
    alert("حدث خطأ أثناء حذف الشركة");
  }
}

async function deleteProduct(productId) {
  if (!isOwner(auth.currentUser)) {
    alert("ليس لديك صلاحية لحذف المنتجات");
    return;
  }

  const product = products.find(item => String(item.id) === String(productId));
  if (!product) return;

  const confirmed = window.confirm(`هل أنت متأكد من حذف المنتج "${product.name}"؟`);
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "products", productId));
    if (String(productIdInput.value) === String(productId)) resetProductForm();
  } catch {
    alert("حدث خطأ أثناء حذف المنتج");
  }
}

loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();

  if (!email || !password) {
    showMessage(loginForm, "يرجى تعبئة البريد الإلكتروني وكلمة المرور", "error");
    return;
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);

    if (!isAllowedAdmin(result.user)) {
      await signOut(auth);
      showMessage(loginForm, "هذا الحساب غير مصرح له بدخول لوحة الأدمن", "error");
      return;
    }

    loginForm.reset();
  } catch {
    showMessage(loginForm, "البريد الإلكتروني أو كلمة المرور غير صحيحة", "error");
  }
});

logoutBtn.addEventListener("click", async function () {
  try {
    await signOut(auth);
  } catch {
    alert("حدث خطأ أثناء تسجيل الخروج");
  }
});

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

companyForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (!isOwner(auth.currentUser)) {
    showMessage(companyForm, "ليس لديك صلاحية لإضافة أو تعديل الشركات", "error");
    return;
  }

  const id = companyIdInput.value.trim();
  const name = companyNameInput.value.trim();
  const image = companyImageDataInput.value.trim() || companyImageInput.value.trim();

  if (!name || !image) {
    showMessage(companyForm, "يرجى تعبئة اسم الشركة والصورة", "error");
    return;
  }

  const duplicate = companies.find(company =>
    company.name.trim().toLowerCase() === name.toLowerCase() &&
    String(company.id) !== String(id)
  );

  if (duplicate) {
    showMessage(companyForm, "يوجد شركة بنفس الاسم بالفعل", "error");
    return;
  }

  try {
    if (id) {
      await updateDoc(doc(db, "companies", id), {
        name,
        image,
        updatedAt: serverTimestamp()
      });
      showMessage(companyForm, "تم تعديل الشركة بنجاح", "success");
    } else {
      await addDoc(collection(db, "companies"), {
        name,
        image,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      showMessage(companyForm, "تمت إضافة الشركة بنجاح", "success");
    }

    resetCompanyForm();
  } catch (error) {
    console.error(error);
    showMessage(companyForm, error.message || "حدث خطأ أثناء حفظ الشركة", "error");
  }
});

cancelCompanyEditBtn.addEventListener("click", resetCompanyForm);

productForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (!isOwner(auth.currentUser)) {
    showMessage(productForm, "ليس لديك صلاحية لإضافة أو تعديل المنتجات", "error");
    return;
  }

  const id = productIdInput.value.trim();
  const companyId = productCompanyInput.value.trim();
  const name = productNameInput.value.trim();
  const desc = productDescInput.value.trim();
  const image = productImageDataInput.value.trim() || productImageInput.value.trim();

  if (!companyId || !name || !desc || !image) {
    showMessage(productForm, "يرجى تعبئة جميع الحقول مع الصورة", "error");
    return;
  }

  const companyExists = companies.some(company => String(company.id) === String(companyId));
  if (!companyExists) {
    showMessage(productForm, "الشركة المختارة غير موجودة", "error");
    return;
  }

  try {
    if (id) {
      await updateDoc(doc(db, "products", id), {
        companyId,
        name,
        desc,
        image,
        updatedAt: serverTimestamp()
      });
      showMessage(productForm, "تم تعديل المنتج بنجاح", "success");
    } else {
      await addDoc(collection(db, "products"), {
        companyId,
        name,
        desc,
        image,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      showMessage(productForm, "تمت إضافة المنتج بنجاح", "success");
    }

    resetProductForm();
  } catch (error) {
    console.error(error);
    showMessage(productForm, error.message || "حدث خطأ أثناء حفظ المنتج", "error");
  }
});

cancelProductEditBtn.addEventListener("click", resetProductForm);

function listenToCompanies() {
  const companiesQuery = query(collection(db, "companies"), orderBy("createdAt", "desc"));

  unsubscribeCompanies = onSnapshot(companiesQuery, (snapshot) => {
    companies = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    renderDashboardData();
  });
}

function listenToProducts() {
  const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));

  unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
    products = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    renderDashboardData();
  });
}

onAuthStateChanged(auth, async (user) => {
  stopListeners();

  if (!user) {
    updateAdminUI(null);
    return;
  }

  if (!isAllowedAdmin(user)) {
    updateAdminUI(null);
    alert("هذا الحساب غير مصرح له بدخول لوحة الأدمن");
    await signOut(auth);
    return;
  }

  updateAdminUI(user);
  listenToCompanies();
  listenToProducts();
});
