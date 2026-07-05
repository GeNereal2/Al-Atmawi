import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
  getDocs
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
const ADMIN_PRODUCTS_PAGE_SIZE = 8;

function getUserRole(user) {
  if (!user || !user.email) return null;

  const email = user.email.toLowerCase();

  if (email === OWNER_ADMIN) return "owner";

  return null;
}

function isOwner(user) {
  return getUserRole(user) === "owner";
}

function isAllowedAdmin(user) {
  return isOwner(user);
}

/* =========================
   State
========================= */
let products = [];

let allFilteredProducts = [];
let adminProductsCursor = 0;
let adminProductsHasMore = false;
let adminProductsLoading = false;
let productSearchTerm = "";

/* Auth */
const loginBox = document.getElementById("loginBox");
const dashboardBox = document.getElementById("dashboardBox");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const logoutBtn = document.getElementById("logoutBtn");
const exportDataBtn = document.getElementById("exportDataBtn");
const adminDisplayName = document.getElementById("adminDisplayName");
const adminRoleLabel = document.getElementById("adminRoleLabel");

/* Product */
const productFormCard = document.getElementById("productFormCard");
const productForm = document.getElementById("productForm");
const productIdInput = document.getElementById("productId");
const productNameInput = document.getElementById("productName");
const productDescInput = document.getElementById("productDesc");
const productCategoryInput = document.getElementById("productCategory");
const productImageInput = document.getElementById("productImage");
const productImageFileInput = document.getElementById("productImageFile");
const productImageDataInput = document.getElementById("productImageData");
const productPreview = document.getElementById("productPreview");
const productFormTitle = document.getElementById("productFormTitle");
const productSubmitBtn = document.getElementById("productSubmitBtn");
const cancelProductEditBtn = document.getElementById("cancelProductEditBtn");
const adminProductsList = document.getElementById("adminProductsList");
const adminProductsSearchInput = document.getElementById("adminProductsSearch");

/* =========================
   Confirm Modal
========================= */
function showConfirmModal(title, msg) {
  return new Promise(resolve => {
    const overlay   = document.getElementById("confirmModal");
    const titleEl   = document.getElementById("confirmModalTitle");
    const msgEl     = document.getElementById("confirmModalMsg");
    const cancelBtn = document.getElementById("confirmModalCancel");
    const okBtn     = document.getElementById("confirmModalOk");

    titleEl.textContent = title;
    msgEl.textContent   = msg;
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";

    function close(result) {
      overlay.classList.remove("active");
      document.body.style.overflow = "";
      cancelBtn.removeEventListener("click", onCancel);
      okBtn.removeEventListener("click", onOk);
      overlay.removeEventListener("click", onOverlay);
      resolve(result);
    }

    function onCancel()   { close(false); }
    function onOk()       { close(true);  }
    function onOverlay(e) { if (e.target === overlay) close(false); }

    cancelBtn.addEventListener("click", onCancel);
    okBtn.addEventListener("click", onOk);
    overlay.addEventListener("click", onOverlay);
  });
}

/* =========================
   Helpers
========================= */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

/* =========================
   Categories
========================= */
const CATEGORY_LABELS = {
  drinks: { label: "مشروبات", icon: "🥤" },
  chips: { label: "شيبسات", icon: "🍟" },
  chocolate: { label: "شوكولاتات", icon: "🍫" }
};

function getCategoryInfo(category) {
  return CATEGORY_LABELS[category] || { label: "غير مصنف", icon: "🍬" };
}

function sortByCreatedAtDesc(items) {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });
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

function downloadJsonFile(filename, data) {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json;charset=utf-8" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportAllData() {
  if (!isOwner(auth.currentUser)) {
    alert("فقط الأدمن الرئيسي يستطيع تصدير البيانات");
    return;
  }

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    products
  };

  downloadJsonFile("al-atmawi-backup.json", exportPayload);
}

/* =========================
   Cloudinary Upload
========================= */
const CLOUDINARY_CLOUD_NAME = "dooabdkr5";
const CLOUDINARY_UPLOAD_PRESET = "alatmawi";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/* =========================
   Image Compression
========================= */
async function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;

        // تصغير الأبعاد إذا كانت أكبر من maxWidth
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }

        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);

        canvas.toBlob(
          (blob) => {
            // إذا فشل الضغط أو الصورة أصغر أصلاً، نرجع الأصلية
            if (!blob || blob.size >= file.size) {
              resolve(file);
            } else {
              resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file); // fallback
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file); // fallback
    reader.readAsDataURL(file);
  });
}

async function uploadToCloudinary(file) {
  // ضغط الصورة قبل الرفع
  const compressed = await compressImage(file);

  const formData = new FormData();
  formData.append("file", compressed);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || "فشل رفع الصورة. تحقق من إعدادات Cloudinary.");
  }

  const data = await response.json();
  return data.secure_url;
}

async function handleImageSelection(fileInput, hiddenInput, previewElement) {
  const file = fileInput.files[0];
  if (!file) return;

  const label = fileInput.closest(".form-group")?.querySelector("label");
  const originalLabel = label?.textContent || "";

  const allowedTypes = ["image/jpeg","image/jpg","image/png"];
  const isAllowed = allowedTypes.includes(file.type) ||
                    file.name.toLowerCase().endsWith(".jpg") ||
                    file.name.toLowerCase().endsWith(".jpeg") ||
                    file.name.toLowerCase().endsWith(".png");

  if (!isAllowed) {
    alert("صيغة الصورة غير مدعومة. استخدم JPG أو PNG فقط");
    fileInput.value = "";
    return;
  }

  try {
    previewElement.src = "";
    previewElement.classList.add("hidden");
    hiddenInput.value = "";

    if (label) label.textContent = "⏳ جاري رفع الصورة...";

    const imageUrl = await uploadToCloudinary(file);

    hiddenInput.value = imageUrl;
    previewElement.src = imageUrl;
    previewElement.classList.remove("hidden");

    if (label) label.textContent = "✅ تم رفع الصورة";
    setTimeout(() => { if (label) label.textContent = originalLabel; }, 3000);

  } catch (error) {
    alert(error.message || "حدث خطأ أثناء رفع الصورة");
    fileInput.value = "";
    hiddenInput.value = "";
    previewElement.src = "";
    previewElement.classList.add("hidden");
    if (label) label.textContent = originalLabel;
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

/* =========================
   Reset Forms
========================= */
function resetProductForm() {
  productForm.reset();
  productIdInput.value = "";
  productCategoryInput.value = "drinks";
  productImageDataInput.value = "";
  productPreview.src = "";
  productPreview.classList.add("hidden");
  productFormTitle.textContent = "إضافة منتج جديد";
  productSubmitBtn.textContent = "إضافة المنتج";
  cancelProductEditBtn.classList.add("hidden");
}

/* =========================
   UI Permissions
========================= */
function applyPermissionsUI(user) {
  if (isOwner(user)) {
    adminRoleLabel.textContent = "صلاحيتك: أدمن كامل";
    productFormCard.classList.remove("hidden");
    return;
  }

  adminRoleLabel.textContent = "";
  productFormCard.classList.add("hidden");
}

/* =========================
   Render
========================= */
function renderProductsList() {
  if (adminProductsLoading && !products.length && !productSearchTerm) {
    adminProductsList.innerHTML = `<div class="empty-message">جاري تحميل المنتجات...</div>`;
    return;
  }

  const term = productSearchTerm.trim().toLowerCase();
  const isSearching = term.length > 0;

  // إذا في بحث فعّال، نفلتر على كل المنتجات المحمّلة (مش بس الصفحة الظاهرة حاليًا)
  const displayedProducts = isSearching
    ? allFilteredProducts.filter(product => product.name.toLowerCase().includes(term))
    : products;

  if (!displayedProducts.length) {
    adminProductsList.innerHTML = isSearching
      ? `<div class="empty-message">لا توجد نتائج مطابقة لـ "${escapeHtml(productSearchTerm.trim())}"</div>`
      : `<div class="empty-message">لا توجد منتجات حاليًا</div>`;
    return;
  }

  adminProductsList.innerHTML = `
    ${displayedProducts.map(product => `
        <div class="admin-item admin-item-compact">
          <div class="admin-item-compact-row">
            <div class="admin-item-icon">${getCategoryInfo(product.category).icon}</div>
            <div class="admin-item-info">
              <h4>${escapeHtml(product.name)}</h4>
              <span class="admin-item-category">${escapeHtml(getCategoryInfo(product.category).label)}</span>
            </div>
            ${isOwner(auth.currentUser) ? `
              <div class="admin-item-actions-inline">
                <button class="action-btn edit-btn" data-product-edit="${product.id}">تعديل</button>
                <button class="action-btn delete-btn" data-product-delete="${product.id}">حذف</button>
              </div>
            ` : ""}
          </div>
        </div>
      `).join("")}

    ${!isSearching && adminProductsHasMore ? `
      <div class="load-more-wrap">
        <button id="adminLoadMoreProductsBtn" class="btn btn-outline" type="button" ${adminProductsLoading ? "disabled" : ""}>
          ${adminProductsLoading ? "جاري التحميل..." : "عرض المزيد"}
        </button>
      </div>
    ` : ""}
  `;

  if (isOwner(auth.currentUser)) {
    document.querySelectorAll("[data-product-edit]").forEach(btn => {
      btn.addEventListener("click", () => startEditProduct(btn.dataset.productEdit));
    });

    document.querySelectorAll("[data-product-delete]").forEach(btn => {
      btn.addEventListener("click", () => deleteProduct(btn.dataset.productDelete));
    });
  }

  const loadMoreBtn = document.getElementById("adminLoadMoreProductsBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadMoreAdminProducts);
  }
}

function updateCounters() {
  const counterProducts = document.getElementById("counterProducts");
  if (!counterProducts) return;
  counterProducts.textContent = allFilteredProducts.length;
}

function renderDashboardData() {
  renderProductsList();
  updateCounters();
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
  updateCounters();
}

/* =========================
   Edit Actions
========================= */
async function startEditProduct(productId) {
  if (!isOwner(auth.currentUser)) return;

  const product = allFilteredProducts.find(item => String(item.id) === String(productId));
  if (!product) return;

  productFormTitle.textContent = "جاري التحميل...";
  productSubmitBtn.textContent = "جاري التحميل...";
  cancelProductEditBtn.classList.remove("hidden");

  try {
    // نجيب البيانات الكاملة مع الصورة بس عند التعديل
    const docSnap = await getDoc(doc(db, "products", productId));
    const fullData = docSnap.exists() ? docSnap.data() : {};
    const image = fullData.image || "";

    productIdInput.value = product.id;
    productNameInput.value = product.name;
    productDescInput.value = product.desc;
    productCategoryInput.value = product.category || "drinks";
    productImageInput.value = String(image).startsWith("data:") ? "" : image;
    productImageDataInput.value = String(image).startsWith("data:") ? image : "";
    productPreview.src = image;
    if (image) productPreview.classList.remove("hidden");

    productFormTitle.textContent = "تعديل المنتج";
    productSubmitBtn.textContent = "حفظ تعديل المنتج";
    productForm.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    console.error(error);
    productFormTitle.textContent = "إضافة منتج جديد";
    productSubmitBtn.textContent = "إضافة المنتج";
  }
}

/* =========================
   Delete Actions
========================= */
async function deleteProduct(productId) {
  if (!isOwner(auth.currentUser)) {
    alert("ليس لديك صلاحية لحذف المنتجات");
    return;
  }

  const product = allFilteredProducts.find(item => String(item.id) === String(productId));
  if (!product) return;

  const confirmed = await showConfirmModal("حذف المنتج", `هل أنت متأكد من حذف المنتج "${product.name}"؟`);
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "products", productId));

    if (String(productIdInput.value) === String(productId)) resetProductForm();

    await refreshAllAdminData();
  } catch (error) {
    console.error(error);
    alert("حدث خطأ أثناء حذف المنتج");
  }
}

/* =========================
   Auth Events
========================= */
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

if (exportDataBtn) {
  exportDataBtn.addEventListener("click", exportAllData);
}

logoutBtn.addEventListener("click", async function () {
  try {
    await signOut(auth);
  } catch {
    alert("حدث خطأ أثناء تسجيل الخروج");
  }
});

/* =========================
   Image Input Events
========================= */
productImageFileInput.addEventListener("change", async () => {
  await handleImageSelection(productImageFileInput, productImageDataInput, productPreview);
  productImageInput.value = "";
});

productImageInput.addEventListener("input", () => {
  if (productImageInput.value.trim()) {
    productImageDataInput.value = "";
    productImageFileInput.value = "";
  }
  updatePreviewFromUrl(productImageInput.value, productPreview, productImageDataInput);
});

/* =========================
   Forms Submit
========================= */
productForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (!isOwner(auth.currentUser)) {
    showMessage(productForm, "ليس لديك صلاحية لإضافة أو تعديل المنتجات", "error");
    return;
  }

  const id = productIdInput.value.trim();
  const name = productNameInput.value.trim();
  const desc = productDescInput.value.trim();
  const category = productCategoryInput.value.trim();
  const image = productImageDataInput.value.trim() || productImageInput.value.trim();
  // productImageDataInput الآن يحمل رابط Cloudinary بدل base64

  if (!name || !desc || !category || !image) {
    showMessage(productForm, "يرجى تعبئة جميع الحقول مع الصورة", "error");
    return;
  }

  try {
    if (id) {
      await updateDoc(doc(db, "products", id), {
        name,
        desc,
        category,
        image,
        updatedAt: serverTimestamp()
      });
      showMessage(productForm, "تم تعديل المنتج بنجاح", "success");
    } else {
      await addDoc(collection(db, "products"), {
        name,
        desc,
        category,
        image,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      showMessage(productForm, "تمت إضافة المنتج بنجاح", "success");
    }

    resetProductForm();
    await refreshAllAdminData();
  } catch (error) {
    console.error(error);
    showMessage(productForm, error.message || "حدث خطأ أثناء حفظ المنتج", "error");
  }
});

cancelProductEditBtn.addEventListener("click", resetProductForm);

if (adminProductsSearchInput) {
  adminProductsSearchInput.addEventListener("input", () => {
    productSearchTerm = adminProductsSearchInput.value;
    renderProductsList();
  });
}

/* =========================
   Data Loading
========================= */
function buildAdminProductsQuery() {
  return query(
    collection(db, "products"),
    orderBy("createdAt", "desc")
  );
}

async function loadInitialAdminProducts() {
  adminProductsLoading = true;
  products = [];
  allFilteredProducts = [];
  adminProductsCursor = 0;
  adminProductsHasMore = false;
  renderProductsList();

  try {
    const productsQuery = buildAdminProductsQuery();
    const snapshot = await getDocs(productsQuery);

    let loadedProducts = snapshot.docs.map(docSnap => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        name: d.name || "",
        desc: d.desc || "",
        category: d.category || "",
        createdAt: d.createdAt || null,
        // image محذوف من القائمة لتخفيف التحميل
        _hasImage: !!d.image
      };
    });

    loadedProducts = sortByCreatedAtDesc(loadedProducts);

    allFilteredProducts = loadedProducts;
    products = loadedProducts.slice(0, ADMIN_PRODUCTS_PAGE_SIZE);
    adminProductsCursor = products.length;
    adminProductsHasMore = adminProductsCursor < allFilteredProducts.length;
  } catch (error) {
    console.error(error);
    products = [];
    allFilteredProducts = [];
    adminProductsCursor = 0;
    adminProductsHasMore = false;
  } finally {
    adminProductsLoading = false;
    renderProductsList();
  }
}

async function loadMoreAdminProducts() {
  if (adminProductsLoading || !adminProductsHasMore) return;

  adminProductsLoading = true;
  renderProductsList();

  try {
    const nextChunk = allFilteredProducts.slice(
      adminProductsCursor,
      adminProductsCursor + ADMIN_PRODUCTS_PAGE_SIZE
    );

    products = [...products, ...nextChunk];
    adminProductsCursor = products.length;
    adminProductsHasMore = adminProductsCursor < allFilteredProducts.length;
  } catch (error) {
    console.error(error);
  } finally {
    adminProductsLoading = false;
    renderProductsList();
  }
}

async function refreshAllAdminData() {
  await loadInitialAdminProducts();
  renderDashboardData();
  updateCounters();
}

/* =========================
   Auth State
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    products = [];
    allFilteredProducts = [];
    adminProductsCursor = 0;
    adminProductsHasMore = false;
    adminProductsLoading = false;
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

  await loadInitialAdminProducts();

  renderDashboardData();
  updateCounters();
});
