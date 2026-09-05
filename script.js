import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
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

/* =========================
   Categories
========================= */
const CATEGORIES = [
  { id: "drinks", label: "المشروبات", subtitle: "تشكيلة من ألذ وأبرد المشروبات", icon: "🥤" },
  { id: "chips", label: "الشيبسات", subtitle: "أشهى أنواع الشيبس والسناكس", icon: "🍟" },
  { id: "chocolate", label: "الشوكولاتات", subtitle: "أفخر أنواع الشوكولاتة العالمية", icon: "🍫" },
  { id: "jelly", label: "جلي وجوميات", subtitle: "حلويات جلي وجوميات بأشكال ونكهات متنوعة", icon: "🍬" },
  { id: "marshmallow", label: "المارشميلو", subtitle: "مارشميلو طري بنكهات متنوعة", icon: "☁️" },
  { id: "toffee", label: "التوفي والملبسات", subtitle: "توفي وملبسات وحلويات كلاسيكية", icon: "🍭" },
  { id: "bigla", label: "بيجلا", subtitle: "تشكيلة بيجلا المميزة", icon: "🥨" }
];

const CATEGORY_IDS = CATEGORIES.map(c => c.id);

// أي منتج قديم بدون تصنيف (أو بتصنيف غير معروف) بيظهر هون بدل ما يختفي
const OTHER_CATEGORY = { id: "__other__", label: "أخرى", subtitle: "منتجات بدون تصنيف محدد", icon: "❓" };

const PRODUCTS_PER_CATEGORY_STEP = 8;

let allProducts = []; // كل المنتجات المحمّلة من Firestore
let isLoadingProducts = false;
let revealCounts = {}; // كم منتج ظاهر حاليًا لكل تصنيف

/* =========================
   Private Pricing (حساب العميل المميز)
========================= */
const PRIVATE_VIEWER_EMAIL = "private@gmail.com";
let isPrivateViewer = false;
let privatePricingMap = {}; // productId -> السعر الخاص

const privateBanner = document.getElementById("privateBanner");
const privateLogoutBtn = document.getElementById("privateLogoutBtn");

privateLogoutBtn.addEventListener("click", () => signOut(auth));

async function loadPrivatePricing() {
  try {
    const snapshot = await getDocs(collection(db, "privatePricing"));
    const map = {};
    snapshot.docs.forEach(docSnap => {
      map[docSnap.id] = docSnap.data().price || "";
    });
    privatePricingMap = map;
  } catch (error) {
    console.error(error);
    privatePricingMap = {};
  }
}

function getDisplayPrice(product) {
  if (isPrivateViewer && privatePricingMap[product.id]) {
    return privatePricingMap[product.id];
  }
  return product.desc || "";
}

onAuthStateChanged(auth, async (user) => {
  const wasPrivateViewer = isPrivateViewer;
  isPrivateViewer = !!(user && user.email && user.email.toLowerCase() === PRIVATE_VIEWER_EMAIL);

  if (isPrivateViewer) {
    await loadPrivatePricing();
    privateBanner.classList.remove("hidden");
  } else {
    privatePricingMap = {};
    privateBanner.classList.add("hidden");
  }

  if (wasPrivateViewer !== isPrivateViewer) renderProducts();

  // حساب الزبون العادي (أي مستخدم مسجل، بما فيهم حساب الأسعار الخاصة نفسه)
  currentCustomerUser = user || null;

  if (currentCustomerUser) {
    await loadCustomerProfile(currentCustomerUser.uid);
  } else {
    currentCustomerPhone = "";
  }

  updateAccountUI();
});

/* =========================
   Customer Account (تسجيل زبون عادي)
========================= */
let currentCustomerUser = null;
let currentCustomerPhone = "";

const accountBtn = document.getElementById("accountBtn");
const accountBtnLabel = document.getElementById("accountBtnLabel");
const accountModal = document.getElementById("accountModal");
const accountModalCloseBtn = document.getElementById("accountModalCloseBtn");

const customerAuthViews = document.getElementById("customerAuthViews");
const customerLoginView = document.getElementById("customerLoginView");
const customerSignupView = document.getElementById("customerSignupView");
const customerAccountView = document.getElementById("customerAccountView");

const customerLoginForm = document.getElementById("customerLoginForm");
const customerLoginEmail = document.getElementById("customerLoginEmail");
const customerLoginPassword = document.getElementById("customerLoginPassword");
const customerLoginError = document.getElementById("customerLoginError");

const customerSignupForm = document.getElementById("customerSignupForm");
const customerSignupName = document.getElementById("customerSignupName");
const customerSignupEmail = document.getElementById("customerSignupEmail");
const customerSignupPhone = document.getElementById("customerSignupPhone");
const customerSignupPassword = document.getElementById("customerSignupPassword");
const customerSignupError = document.getElementById("customerSignupError");

const showSignupBtn = document.getElementById("showSignupBtn");
const showLoginBtn = document.getElementById("showLoginBtn");

const customerAccountName = document.getElementById("customerAccountName");
const customerAccountEmail = document.getElementById("customerAccountEmail");
const customerAccountNameInput = document.getElementById("customerAccountNameInput");
const customerAccountPhone = document.getElementById("customerAccountPhone");
const customerPhoneMessage = document.getElementById("customerPhoneMessage");
const saveCustomerPhoneBtn = document.getElementById("saveCustomerPhoneBtn");
const customerLogoutBtn = document.getElementById("customerLogoutBtn");

function translateAuthError(error) {
  const code = error && error.code ? error.code : "";
  const map = {
    "auth/email-already-in-use": "هذا البريد الإلكتروني مسجل مسبقًا، جرب تسجل الدخول بدل ما تعمل حساب جديد",
    "auth/invalid-email": "البريد الإلكتروني غير صحيح",
    "auth/weak-password": "كلمة المرور لازم تكون 6 أحرف على الأقل",
    "auth/wrong-password": "كلمة المرور غير صحيحة",
    "auth/user-not-found": "ما في حساب بهذا البريد الإلكتروني",
    "auth/invalid-credential": "بيانات الدخول غير صحيحة",
    "auth/too-many-requests": "محاولات كثيرة، جرب بعد شوي"
  };
  return map[code] || "حدث خطأ، حاول مرة ثانية";
}

function openAccountModal() {
  accountModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeAccountModal() {
  accountModal.classList.remove("active");
  document.body.style.overflow = "";
}

function showCustomerLoginView() {
  customerLoginView.classList.remove("hidden");
  customerSignupView.classList.add("hidden");
  customerLoginError.classList.add("hidden");
}

function showCustomerSignupView() {
  customerSignupView.classList.remove("hidden");
  customerLoginView.classList.add("hidden");
  customerSignupError.classList.add("hidden");
}

function updateAccountUI() {
  if (currentCustomerUser) {
    accountBtnLabel.textContent = `👤 ${currentCustomerUser.displayName || "حسابي"}`;
    customerAuthViews.classList.add("hidden");
    customerAccountView.classList.remove("hidden");
    customerAccountName.textContent = currentCustomerUser.displayName || "";
    customerAccountEmail.textContent = currentCustomerUser.email || "";
    customerAccountNameInput.value = currentCustomerUser.displayName || "";
    customerAccountPhone.value = currentCustomerPhone || "";
    customerPhoneMessage.classList.add("hidden");
  } else {
    accountBtnLabel.textContent = "👤 دخول";
    customerAccountView.classList.add("hidden");
    customerAuthViews.classList.remove("hidden");
    showCustomerLoginView();
  }
}

async function loadCustomerProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "customers", uid));
    currentCustomerPhone = snap.exists() ? (snap.data().phone || "") : "";
  } catch (error) {
    console.error(error);
    currentCustomerPhone = "";
  }
}

async function saveCustomerProfile(phone, name) {
  if (!currentCustomerUser) return;
  await setDoc(doc(db, "customers", currentCustomerUser.uid), {
    name: name || currentCustomerUser.displayName || "",
    email: currentCustomerUser.email || "",
    phone,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

accountBtn.addEventListener("click", openAccountModal);
accountModalCloseBtn.addEventListener("click", closeAccountModal);
accountModal.addEventListener("click", (e) => {
  if (e.target === accountModal) closeAccountModal();
});
showSignupBtn.addEventListener("click", showCustomerSignupView);
showLoginBtn.addEventListener("click", showCustomerLoginView);

customerLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  customerLoginError.classList.add("hidden");

  const email = customerLoginEmail.value.trim();
  const password = customerLoginPassword.value.trim();
  if (!email || !password) return;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    customerLoginForm.reset();
    closeAccountModal();
  } catch (error) {
    console.error(error);
    customerLoginError.textContent = translateAuthError(error);
    customerLoginError.classList.remove("hidden");
  }
});

customerSignupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  customerSignupError.classList.add("hidden");

  const name = customerSignupName.value.trim();
  const email = customerSignupEmail.value.trim();
  const phone = customerSignupPhone.value.trim();
  const password = customerSignupPassword.value.trim();
  if (!name || !email || !phone || !password) return;

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    await setDoc(doc(db, "customers", credential.user.uid), {
      name,
      email,
      phone,
      createdAt: serverTimestamp()
    });
    currentCustomerUser = credential.user;
    currentCustomerPhone = phone;
    updateAccountUI();
    customerSignupForm.reset();
    closeAccountModal();
  } catch (error) {
    console.error(error);
    customerSignupError.textContent = translateAuthError(error);
    customerSignupError.classList.remove("hidden");
  }
});

customerLogoutBtn.addEventListener("click", () => signOut(auth));

saveCustomerPhoneBtn.addEventListener("click", async () => {
  customerPhoneMessage.classList.add("hidden");
  const name = customerAccountNameInput.value.trim();
  const phone = customerAccountPhone.value.trim();

  if (!name || !phone) {
    customerPhoneMessage.textContent = "اكتب اسمك ورقم الواتساب أولاً";
    customerPhoneMessage.classList.remove("hidden");
    return;
  }

  saveCustomerPhoneBtn.disabled = true;
  saveCustomerPhoneBtn.textContent = "جاري الحفظ...";

  try {
    if (currentCustomerUser.displayName !== name) {
      await updateProfile(currentCustomerUser, { displayName: name });
    }
    await saveCustomerProfile(phone, name);
    currentCustomerPhone = phone;
    customerAccountName.textContent = name;
    accountBtnLabel.textContent = `👤 ${name}`;
    if (typeof window.showToast === "function") window.showToast("✅ تم حفظ بياناتك");
  } catch (error) {
    console.error(error);
    customerPhoneMessage.textContent = "حدث خطأ أثناء حفظ البيانات";
    customerPhoneMessage.classList.remove("hidden");
  } finally {
    saveCustomerPhoneBtn.disabled = false;
    saveCustomerPhoneBtn.textContent = "حفظ البيانات";
  }
});

/* =========================
   Shopping Cart (سلة المشتريات)
========================= */
const CART_STORAGE_KEY = "al-atmawi-cart";

let cart = loadCart();

const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartModal = document.getElementById("cartModal");
const cartModalCloseBtn = document.getElementById("cartModalCloseBtn");
const cartItemsList = document.getElementById("cartItemsList");
const cartEmptyMessage = document.getElementById("cartEmptyMessage");
const cartTotalRow = document.getElementById("cartTotalRow");
const cartTotalAmount = document.getElementById("cartTotalAmount");
const submitOrderBtn = document.getElementById("submitOrderBtn");
const cartMessage = document.getElementById("cartMessage");

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // تجاهل أخطاء تجاوز المساحة المسموحة
  }
}

function getCartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function extractPriceNumber(priceText) {
  if (!priceText) return 0;
  // بياخد آخر رقم موجود بالنص (عشان لو كتب "بدل 20 صار 15" ياخد السعر الفعلي 15)
  const matches = String(priceText).match(/\d+(\.\d+)?/g);
  if (!matches || !matches.length) return 0;
  return parseFloat(matches[matches.length - 1]) || 0;
}

function calculateCartTotal() {
  return cart.reduce((sum, item) => sum + (extractPriceNumber(item.price) * item.qty), 0);
}

function updateCartBadge() {
  const count = getCartCount();
  if (count > 0) {
    cartCount.textContent = count;
    cartCount.classList.remove("hidden");
  } else {
    cartCount.classList.add("hidden");
  }
}

function addToCart(product) {
  if (!currentCustomerUser) {
    openAccountModal();
    return;
  }

  const existing = cart.find(item => item.productId === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      image: product.image || "",
      price: getDisplayPrice(product),
      qty: 1
    });
  }
  saveCart();
  updateCartBadge();
  if (typeof window.showToast === "function") window.showToast("✅ تمت الإضافة للسلة");
}

function changeCartQty(productId, delta) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.productId !== productId);
  }
  saveCart();
  renderCart();
  updateCartBadge();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.productId !== productId);
  saveCart();
  renderCart();
  updateCartBadge();
}

function renderCart() {
  if (!cart.length) {
    cartItemsList.innerHTML = "";
    cartEmptyMessage.classList.remove("hidden");
    cartTotalRow.classList.add("hidden");
    submitOrderBtn.classList.add("hidden");
    return;
  }

  cartEmptyMessage.classList.add("hidden");
  submitOrderBtn.classList.remove("hidden");

  const total = calculateCartTotal();
  if (total > 0) {
    cartTotalAmount.textContent = total.toLocaleString("ar-EG");
    cartTotalRow.classList.remove("hidden");
  } else {
    cartTotalRow.classList.add("hidden");
  }

  cartItemsList.innerHTML = cart.map(item => `
    <div class="cart-item" data-cart-product-id="${item.productId}">
      <div class="cart-item-image">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />
      </div>
      <div class="cart-item-info">
        <h4>${escapeHtml(item.name)}</h4>
        ${item.price ? `<p>${escapeHtml(item.price)}</p>` : ""}
      </div>
      <div class="cart-item-qty">
        <button type="button" data-qty-decrease="${item.productId}">−</button>
        <span>${item.qty}</span>
        <button type="button" data-qty-increase="${item.productId}">+</button>
      </div>
      <button type="button" class="cart-item-remove" data-cart-remove="${item.productId}">🗑️</button>
    </div>
  `).join("");

  cartItemsList.querySelectorAll("[data-qty-decrease]").forEach(btn => {
    btn.addEventListener("click", () => changeCartQty(btn.dataset.qtyDecrease, -1));
  });
  cartItemsList.querySelectorAll("[data-qty-increase]").forEach(btn => {
    btn.addEventListener("click", () => changeCartQty(btn.dataset.qtyIncrease, 1));
  });
  cartItemsList.querySelectorAll("[data-cart-remove]").forEach(btn => {
    btn.addEventListener("click", () => removeFromCart(btn.dataset.cartRemove));
  });
}

function openCartModal() {
  renderCart();
  cartMessage.classList.add("hidden");
  cartModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeCartModal() {
  cartModal.classList.remove("active");
  document.body.style.overflow = "";
}

cartBtn.addEventListener("click", openCartModal);
cartModalCloseBtn.addEventListener("click", closeCartModal);
cartModal.addEventListener("click", (e) => {
  if (e.target === cartModal) closeCartModal();
});

submitOrderBtn.addEventListener("click", async () => {
  cartMessage.classList.add("hidden");

  if (!currentCustomerUser) {
    openAccountModal();
    return;
  }
  if (!cart.length) return;

  if (!currentCustomerPhone) {
    cartMessage.textContent = "لازم تضيف رقم الواتساب من صفحة حسابك قبل ما ترسل الطلب";
    cartMessage.classList.remove("hidden");
    openAccountModal();
    return;
  }

  submitOrderBtn.disabled = true;
  submitOrderBtn.textContent = "جاري الإرسال...";

  try {
    await addDoc(collection(db, "orders"), {
      customerName: currentCustomerUser.displayName || "بدون اسم",
      customerEmail: currentCustomerUser.email || "",
      customerPhone: currentCustomerPhone,
      customerUid: currentCustomerUser.uid,
      items: cart.map(item => ({
        productId: item.productId,
        name: item.name,
        qty: item.qty,
        price: item.price || ""
      })),
      total: calculateCartTotal(),
      status: "جديد",
      createdAt: serverTimestamp()
    });

    cart = [];
    saveCart();
    renderCart();
    updateCartBadge();
    closeCartModal();
    if (typeof window.showToast === "function") window.showToast("✅ تم إرسال طلبك بنجاح، رح نتواصل معك قريبًا");
  } catch (error) {
    console.error(error);
    cartMessage.textContent = "حدث خطأ أثناء إرسال الطلب، حاول مرة ثانية";
    cartMessage.classList.remove("hidden");
  } finally {
    submitOrderBtn.disabled = false;
    submitOrderBtn.textContent = "إرسال الطلب";
  }
});

updateCartBadge();
const PRODUCTS_CACHE_MAX_AGE = 2 * 60 * 1000; // دقيقتين

const productModal = document.getElementById("productModal");
const modalImg = document.getElementById("modalImg");
const modalName = document.getElementById("modalName");
const modalDesc = document.getElementById("modalDesc");
const modalBadge = document.getElementById("modalBadge");
const modalCloseBtn = document.getElementById("modalCloseBtn");

function openModal(product) {
  modalImg.src = product.image || "";
  modalImg.alt = product.name || "";
  modalName.textContent = product.name || "";
  modalBadge.textContent = product.isOffer ? "🔥 عرض خاص" : "";
  const displayPrice = getDisplayPrice(product);
  if (displayPrice) {
    modalDesc.textContent = "السعر: " + displayPrice;
    modalDesc.style.display = "block";
  } else {
    modalDesc.style.display = "none";
  }
  productModal.classList.add("active");
  document.body.style.overflow = "hidden";

  const url = new URL(location.href);
  url.searchParams.set("product", product.id);
  history.replaceState(null, "", url.toString());
}

function closeModal() {
  productModal.classList.remove("active");
  document.body.style.overflow = "";

  const url = new URL(location.href);
  url.searchParams.delete("product");
  history.replaceState(null, "", url.toString());
}

modalCloseBtn.addEventListener("click", closeModal);
productModal.addEventListener("click", (e) => {
  if (e.target === productModal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

const productsCategories = document.getElementById("productsCategories");
const offersSection = document.getElementById("offers");
const offersGrid = document.getElementById("offersGrid");

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

/* ===== Instant-paint cache (sessionStorage) =====
   يخزن المنتجات مؤقتًا عشان تظهر فورًا عند التنقل
   بينما يتم تحديثها بالخلفية من Firestore. */
function readProductsCache() {
  try {
    const raw = sessionStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return null;
    if (Date.now() - parsed.timestamp > PRODUCTS_CACHE_MAX_AGE) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

function writeProductsCache(items) {
  try {
    sessionStorage.setItem(
      PRODUCTS_CACHE_KEY,
      JSON.stringify({ items, timestamp: Date.now() })
    );
  } catch {
    // تجاهل أخطاء تجاوز المساحة المسموحة
  }
}

/* ===== Skeleton Loaders ===== */
function getProductSkeletons(count = 4) {
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
function animateCards(container) {
  const cards = container.querySelectorAll(".product-card:not(.skeleton-card)");
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

function getProductsByCategory(categoryId) {
  if (categoryId === OTHER_CATEGORY.id) {
    return allProducts.filter(p => !p.isOffer && !CATEGORY_IDS.includes(p.category));
  }
  return allProducts.filter(p => !p.isOffer && p.category === categoryId);
}

function getOfferProducts() {
  return allProducts.filter(p => p.isOffer);
}

function renderOfferCard(product) {
  const displayPrice = getDisplayPrice(product);
  return `
    <div class="product-card offer-card product-card-clickable" data-product-id="${product.id}">
      <div class="offer-ribbon">🔥 عرض خاص</div>
      <div class="product-image">
        <img
          src="${escapeHtml(product.image || "")}"
          alt="${escapeHtml(product.name)}"
          loading="lazy"
          decoding="async"
        >
      </div>
      <div class="product-content">
        <h4>${escapeHtml(product.name)}</h4>
        ${displayPrice ? `<p>السعر: ${escapeHtml(displayPrice)}</p>` : ""}
        <button type="button" class="add-to-cart-btn" data-add-to-cart="${product.id}">أضف للسلة 🛒</button>
      </div>
    </div>
  `;
}

function renderOffers() {
  const offers = getOfferProducts();

  if (!offers.length && !isLoadingProducts) {
    offersSection.classList.add("hidden");
    offersGrid.innerHTML = "";
    return;
  }

  offersSection.classList.remove("hidden");

  offersGrid.innerHTML = !offers.length && isLoadingProducts
    ? getProductSkeletons(4)
    : offers.map(renderOfferCard).join("");

  animateCards(offersSection);

  offersGrid.querySelectorAll(".product-card-clickable").forEach(card => {
    card.addEventListener("click", () => {
      const productId = card.dataset.productId;
      const product = allProducts.find(p => p.id === productId);
      if (!product) return;
      openModal(product);
    });
  });

  offersGrid.querySelectorAll("[data-add-to-cart]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const product = allProducts.find(p => p.id === btn.dataset.addToCart);
      if (product) addToCart(product);
    });
  });
}

function renderProductCard(product) {
  const displayPrice = getDisplayPrice(product);
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
        <h4>${escapeHtml(product.name)}</h4>
        ${displayPrice ? `<p>السعر: ${escapeHtml(displayPrice)}</p>` : ""}
        <button type="button" class="add-to-cart-btn" data-add-to-cart="${product.id}">أضف للسلة 🛒</button>
      </div>
    </div>
  `;
}

function renderCategorySection(category) {
  const items = getProductsByCategory(category.id);

  if (!items.length && !isLoadingProducts) return "";

  const revealed = revealCounts[category.id] || PRODUCTS_PER_CATEGORY_STEP;
  const visibleItems = items.slice(0, revealed);
  const hasMore = items.length > revealed;

  const gridHtml = !items.length && isLoadingProducts
    ? getProductSkeletons(4)
    : visibleItems.map(renderProductCard).join("");

  return `
    <div class="category-block" data-category="${category.id}">
      <div class="category-header">
        <h3><span class="category-icon">${category.icon}</span> ${escapeHtml(category.label)}</h3>
        <p>${escapeHtml(category.subtitle)}</p>
      </div>
      <div class="products-grid" data-category-grid="${category.id}">
        ${gridHtml}
      </div>
      ${hasMore ? `
        <div class="load-more-wrap">
          <button class="btn btn-outline category-load-more" data-category-more="${category.id}" type="button">
            عرض المزيد
          </button>
        </div>
      ` : ""}
    </div>
  `;
}

function renderProducts() {
  renderOffers();

  const hasOtherItems = getProductsByCategory(OTHER_CATEGORY.id).length > 0;
  const allSections = hasOtherItems ? [...CATEGORIES, OTHER_CATEGORY] : CATEGORIES;

  if (!allProducts.length && isLoadingProducts) {
    productsCategories.innerHTML = CATEGORIES.map(cat => `
      <div class="category-block" data-category="${cat.id}">
        <div class="category-header">
          <h3><span class="category-icon">${cat.icon}</span> ${escapeHtml(cat.label)}</h3>
          <p>${escapeHtml(cat.subtitle)}</p>
        </div>
        <div class="products-grid">${getProductSkeletons(4)}</div>
      </div>
    `).join("");
    return;
  }

  const sectionsHtml = allSections.map(renderCategorySection).filter(Boolean).join("");

  if (!sectionsHtml) {
    productsCategories.innerHTML = `<div class="empty-message">لا توجد منتجات حاليًا</div>`;
    return;
  }

  productsCategories.innerHTML = sectionsHtml;

  productsCategories.querySelectorAll(".category-block").forEach(block => {
    animateCards(block);
  });

  productsCategories.querySelectorAll(".product-card-clickable").forEach(card => {
    card.addEventListener("click", () => {
      const productId = card.dataset.productId;
      const product = allProducts.find(p => p.id === productId);
      if (!product) return;
      openModal(product);
    });
  });

  productsCategories.querySelectorAll("[data-add-to-cart]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const product = allProducts.find(p => p.id === btn.dataset.addToCart);
      if (product) addToCart(product);
    });
  });

  productsCategories.querySelectorAll("[data-category-more]").forEach(btn => {
    btn.addEventListener("click", () => {
      const categoryId = btn.dataset.categoryMore;
      revealCounts[categoryId] = (revealCounts[categoryId] || PRODUCTS_PER_CATEGORY_STEP) + PRODUCTS_PER_CATEGORY_STEP;
      renderProducts();
    });
  });
}

async function loadInitialProducts() {
  isLoadingProducts = true;
  revealCounts = {};

  // رسم فوري من الكاش (إن وجد) بينما نجيب البيانات الحقيقية بالخلفية
  const cached = readProductsCache();
  allProducts = cached && cached.length ? cached : [];
  renderProducts();

  try {
    const productsQuery = query(
      collection(db, "products"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(productsQuery);

    const loadedProducts = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    allProducts = loadedProducts;
    writeProductsCache(loadedProducts);
  } catch (error) {
    console.error(error);
    if (!allProducts.length) {
      productsCategories.innerHTML = `<div class="empty-message">حدث خطأ أثناء تحميل المنتجات</div>`;
    }
  } finally {
    isLoadingProducts = false;
    renderProducts();
  }
}

async function checkDeepLink() {
  const params = new URLSearchParams(location.search);
  const productId = params.get("product");
  if (!productId) return;

  try {
    const productRef = doc(db, "products", productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) return;

    const product = { id: productSnap.id, ...productSnap.data() };
    openModal(product);

    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    console.error("Deep link error:", err);
  }
}

async function init() {
  await loadInitialProducts();
  await checkDeepLink();
}

init();
