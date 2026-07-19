import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
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

const privateLoginLink = document.getElementById("privateLoginLink");
const privateLoginModal = document.getElementById("privateLoginModal");
const privateLoginForm = document.getElementById("privateLoginForm");
const privateLoginEmail = document.getElementById("privateLoginEmail");
const privateLoginPassword = document.getElementById("privateLoginPassword");
const privateLoginError = document.getElementById("privateLoginError");
const privateLoginCloseBtn = document.getElementById("privateLoginCloseBtn");
const privateBanner = document.getElementById("privateBanner");
const privateLogoutBtn = document.getElementById("privateLogoutBtn");

function openPrivateLoginModal() {
  privateLoginError.classList.add("hidden");
  privateLoginModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closePrivateLoginModal() {
  privateLoginModal.classList.remove("active");
  document.body.style.overflow = "";
  privateLoginForm.reset();
}

privateLoginLink.addEventListener("click", openPrivateLoginModal);
privateLoginCloseBtn.addEventListener("click", closePrivateLoginModal);
privateLoginModal.addEventListener("click", (e) => {
  if (e.target === privateLoginModal) closePrivateLoginModal();
});

privateLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  privateLoginError.classList.add("hidden");

  const email = privateLoginEmail.value.trim();
  const password = privateLoginPassword.value.trim();
  if (!email || !password) return;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    closePrivateLoginModal();
  } catch (error) {
    console.error(error);
    privateLoginError.textContent = "بيانات الدخول غير صحيحة";
    privateLoginError.classList.remove("hidden");
  }
});

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
});

const PRODUCTS_CACHE_KEY = "al-atmawi-products-cache-v2";
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
