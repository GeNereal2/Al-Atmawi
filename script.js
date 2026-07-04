import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  query
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

let currentUser = null;
let visibleProducts = [];
let isLoadingProducts = false;
let hasMoreProducts = false;
let allProductsDocs = [];
let productsCursor = 0;

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
  modalBadge.textContent = "";
  if (product.desc && canSeePrices(currentUser)) {
    modalDesc.textContent = product.desc;
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

function sortProductsByCreatedAt(items) {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });
}

/* ===== Skeleton Loaders ===== */
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
  productsSectionTitle.textContent = "كل المنتجات";
  productsSectionSubtitle.textContent = "استعرض جميع منتجاتنا";

  if (!visibleProducts.length && isLoadingProducts) {
    productsGrid.innerHTML = getProductSkeletons(8);
    return;
  }

  if (!visibleProducts.length) {
    productsGrid.innerHTML = `<div class="empty-message">لا توجد منتجات حاليًا</div>`;
    return;
  }

  const showPrices = canSeePrices(currentUser);

  productsGrid.innerHTML = `
    ${visibleProducts.map(product => `
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
            ${showPrices ? `<p>${escapeHtml(product.desc || "")}</p>` : ""}
          </div>
        </div>
      `).join("")}
    ${getLoadMoreButtonHtml()}
  `;

  animateCards(".product-card:not(.skeleton-card)");

  document.querySelectorAll(".product-card-clickable").forEach(card => {
    card.addEventListener("click", () => {
      const productId = card.dataset.productId;
      const product = visibleProducts.find(p => p.id === productId);
      if (!product) return;
      openModal(product);
    });
  });

  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadMoreProducts);
  }
}

async function loadInitialProducts() {
  isLoadingProducts = true;
  visibleProducts = [];
  hasMoreProducts = false;
  allProductsDocs = [];
  productsCursor = 0;
  renderProducts();

  try {
    const productsQuery = query(collection(db, "products"));
    const snapshot = await getDocs(productsQuery);

    const loadedProducts = sortProductsByCreatedAt(
      snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
    );

    allProductsDocs = loadedProducts;
    visibleProducts = loadedProducts.slice(0, PRODUCTS_PAGE_SIZE);
    productsCursor = visibleProducts.length;
    hasMoreProducts = productsCursor < allProductsDocs.length;
  } catch (error) {
    console.error(error);
    visibleProducts = [];
    allProductsDocs = [];
    productsCursor = 0;
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
    const nextChunk = allProductsDocs.slice(
      productsCursor,
      productsCursor + PRODUCTS_PAGE_SIZE
    );

    visibleProducts = [...visibleProducts, ...nextChunk];
    productsCursor = visibleProducts.length;
    hasMoreProducts = productsCursor < allProductsDocs.length;
  } catch (error) {
    console.error(error);
  } finally {
    isLoadingProducts = false;
    renderProducts();
  }
}

function rerenderProductsForAuthChange() {
  renderProducts();
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
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    rerenderProductsForAuthChange();
  });

  await loadInitialProducts();
  await checkDeepLink();
}

init();
