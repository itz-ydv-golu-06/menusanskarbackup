/* ==============================================================
   menu.js — Sanskar Grand · Full Menu Page behaviour
   Owns: loading the shared menu data, live search, category
   filtering, grid/list view, dark-mode toggle, and favoriting.
   Rendering always starts from the full item list in memory, so
   filters simply recompute a "visible" subset and re-render —
   no separate DOM state to keep in sync.

   Loaded as type="module" (see menu.html) purely so it can use
   dynamic import() for the Firebase ordering helpers. It still
   freely reads the classic-script globals SanskarDB (storage.js)
   and CartStore (cart.js), since classic <script> globals stay
   visible to module scripts loaded afterwards in the same page.

   IMPORTANT: firebase.js is intentionally NOT imported at the top
   of this file. If Firebase isn't configured yet (placeholder keys
   in js/firebase.js) or its CDN import fails, a top-level import
   would throw before any of this file runs — silently breaking
   menu rendering, Add to Cart, and the cart drawer along with it.
   Instead it's dynamically imported inside handlePlaceOrder(),
   right when it's actually needed, so the rest of the ordering
   experience (cart, drawer, totals) works even before Firebase is
   set up — only "Order Now" needs it.
   ============================================================== */

const GST_RATE = 0.05; // keep in sync with js/firebase.js — 5%, set to 0 to disable

/* ---- Ordering hours: 7:00 AM – 10:30 PM, guest's local device time ----
   Backed up server-side too — see isWithinOrderingHours() in firestore.rules,
   which rejects the write outright even if someone bypasses this UI. */
const ORDER_WINDOW_START_MIN = 7 * 60;        // 7:00 AM
const ORDER_WINDOW_END_MIN = 22 * 60 + 30;    // 10:30 PM

function isOrderingOpen() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= ORDER_WINDOW_START_MIN && minutes <= ORDER_WINDOW_END_MIN;
}

/* ---- Per-device order rate limit: max 2 orders per rolling 60s window ----
   This is a client-side, per-browser limiter (localStorage), not a true
   per-IP limit — a real IP-based limit needs a server (Cloud Functions),
   which this static-site + client-Firestore setup doesn't use. This still
   stops accidental double-orders and casual spam from the same device. */
const ORDER_RATE_LIMIT_KEY = "sg_order_timestamps";
const ORDER_RATE_LIMIT_MAX = 2;
const ORDER_RATE_LIMIT_WINDOW_MS = 60 * 1000;

function getRecentOrderTimestamps() {
  try {
    const raw = JSON.parse(localStorage.getItem(ORDER_RATE_LIMIT_KEY) || "[]");
    const cutoff = Date.now() - ORDER_RATE_LIMIT_WINDOW_MS;
    return Array.isArray(raw) ? raw.filter((t) => t > cutoff) : [];
  } catch {
    return [];
  }
}

function isRateLimited() {
  return getRecentOrderTimestamps().length >= ORDER_RATE_LIMIT_MAX;
}

function recordOrderTimestamp() {
  const recent = getRecentOrderTimestamps();
  recent.push(Date.now());
  localStorage.setItem(ORDER_RATE_LIMIT_KEY, JSON.stringify(recent.slice(-10)));
}

let ALL_MENU = null;         // full { restaurant, categories, items }
let activeCategory = "all";
let activeSearch = "";
let showFavoritesOnly = false;
let currentView = "grid";

document.addEventListener("DOMContentLoaded", async () => {
  initLoadingScreen();
  initNavbar();
  initMobileNav();
  initFooterYear();
  initTheme();
  initViewToggle();
  initCart();

  try {
    ALL_MENU = await SanskarDB.getMenu();
  } catch (err) {
    console.error(err);
    document.getElementById("menu-grid").innerHTML =
      `<div class="empty-state"><div class="glyph">⚠️</div><p>Could not load the menu right now. Please refresh.</p></div>`;
    return;
  }

  // honour ?category= coming from homepage links / footer links
  const params = new URLSearchParams(window.location.search);
  const preselected = params.get("category");
  if (preselected && ALL_MENU.categories.some((c) => c.id === preselected)) {
    activeCategory = preselected;
  }

  renderCategoryChips();
  initSearch();
  initFavoritesFilter();
  renderMenu();
});

/* -------- Reused small utilities also used on the homepage -------- */
function initLoadingScreen() {
  const loader = document.getElementById("loading-screen");
  if (!loader) return;
  window.addEventListener("load", () => setTimeout(() => loader.classList.add("hidden"), 400));
}
function initNavbar() {
  const nav = document.querySelector(".navbar");
  if (!nav) return;
  const toggle = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  toggle();
  window.addEventListener("scroll", toggle, { passive: true });
}
function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => {
    toggle.classList.toggle("open");
    links.classList.toggle("open");
  });
}
function initFooterYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

/* ---------------------------- Theme -------------------------------- */
function initTheme() {
  const saved = SanskarDB.getTheme();
  applyTheme(saved);
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const next = document.body.classList.contains("theme-light") ? "dark" : "light";
    applyTheme(next);
    SanskarDB.setTheme(next);
  });
}
function applyTheme(theme) {
  document.body.classList.toggle("theme-light", theme === "light");
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = theme === "light" ? "🌙" : "☀️";
}

/* ------------------------- View toggle ------------------------------ */
function initViewToggle() {
  const gridBtn = document.getElementById("view-grid-btn");
  const listBtn = document.getElementById("view-list-btn");
  if (!gridBtn || !listBtn) return;
  gridBtn.addEventListener("click", () => setView("grid"));
  listBtn.addEventListener("click", () => setView("list"));
}
function setView(view) {
  currentView = view;
  document.getElementById("menu-grid").classList.toggle("list-view", view === "list");
  document.getElementById("view-grid-btn").classList.toggle("active", view === "grid");
  document.getElementById("view-list-btn").classList.toggle("active", view === "list");
}

/* ------------------------ Category chips ----------------------------- */
function renderCategoryChips() {
  const wrap = document.getElementById("cat-filters");
  if (!wrap) return;
  const all = [{ id: "all", name: "All Dishes", icon: "🍽️" }, ...ALL_MENU.categories];
  wrap.innerHTML = all
    .map(
      (cat) => `
      <button class="chip ${cat.id === activeCategory ? "active" : ""}" data-cat="${cat.id}">
        <span>${cat.icon}</span> ${cat.name}
      </button>`
    )
    .join("");
  wrap.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCategory = chip.dataset.cat;
      wrap.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      renderMenu();
    });
  });
}

/* --------------------------- Live search ------------------------------ */
function initSearch() {
  const input = document.getElementById("search-input");
  if (!input) return;
  let debounceId;
  input.addEventListener("input", () => {
    clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      activeSearch = input.value.trim().toLowerCase();
      renderMenu();
    }, 180);
  });
}

/* ------------------------- Favorites filter ----------------------------- */
function initFavoritesFilter() {
  const btn = document.getElementById("fav-filter-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    showFavoritesOnly = !showFavoritesOnly;
    btn.classList.toggle("active", showFavoritesOnly);
    renderMenu();
  });
}

/* ---------------------------- Rendering --------------------------------- */
function getFilteredItems() {
  const favs = SanskarDB.getFavorites();
  return ALL_MENU.items.filter((item) => {
    if (activeCategory !== "all" && item.category !== activeCategory) return false;
    if (showFavoritesOnly && !favs.includes(item.id)) return false;
    if (activeSearch) {
      const haystack = `${item.name} ${item.description}`.toLowerCase();
      if (!haystack.includes(activeSearch)) return false;
    }
    return true;
  });
}

function renderMenu() {
  const grid = document.getElementById("menu-grid");
  const meta = document.getElementById("results-count");
  const items = getFilteredItems();

  if (meta) {
    meta.textContent = `${items.length} dish${items.length === 1 ? "" : "es"}`;
  }

  if (!items.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="glyph">🔍</div>
        <p>No dishes match your search. Try another keyword or category.</p>
      </div>`;
    return;
  }

  const favs = SanskarDB.getFavorites();
  const catNameById = Object.fromEntries(ALL_MENU.categories.map((c) => [c.id, c.name]));

  grid.innerHTML = items
    .map((item, i) => {
      const isFav = favs.includes(item.id);
      return `
      <article class="food-card ${item.available ? "" : "unavailable"}" style="animation-delay:${Math.min(i, 10) * 0.04}s">
        <div class="food-media">
          ${window.dishMedia(item)}
          <div class="badge-row">
            ${item.chefSpecial ? `<span class="badge badge-chef">Chef Special</span>` : ""}
            ${item.bestseller ? `<span class="badge badge-best">Best Seller</span>` : ""}
            ${!item.available ? `<span class="badge badge-unavailable">Sold Out</span>` : ""}
          </div>
          <button class="fav-btn ${isFav ? "active" : ""}" data-id="${item.id}" aria-label="Toggle favorite for ${item.name}">
            ${isFav ? "♥" : "♡"}
          </button>
          <div class="veg-mark ${item.veg ? "" : "nonveg"}" title="${item.veg ? "Vegetarian" : "Non-Vegetarian"}"></div>
        </div>
        <div class="food-body">
          <span class="cat-tag">${catNameById[item.category] || item.category}</span>
          <h4>${item.name}<span class="price">₹${item.price}</span></h4>
          <p>${item.description}</p>
          ${
            item.available
              ? `<button class="add-cart-btn" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" aria-label="Add ${item.name} to cart">+ Add to Cart</button>`
              : `<button class="add-cart-btn" disabled>Sold Out</button>`
          }
        </div>
      </article>`;
    })
    .join("");

  grid.querySelectorAll(".fav-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      SanskarDB.toggleFavorite(btn.dataset.id);
      renderMenu();
    });
  });

  grid.querySelectorAll(".add-cart-btn:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = ALL_MENU.items.find((i) => i.id === btn.dataset.id);
      if (!item) return;
      CartStore.addItem({ id: item.id, name: item.name, price: item.price, image: item.image || "" });
      btn.classList.remove("bump");
      void btn.offsetWidth; // restart animation
      btn.classList.add("bump");
      showToast(`${item.name} added to cart`);
    });
  });
}

/* ==================================================================
   Cart drawer, checkout, and order placement
   ================================================================== */

function initCart() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-overlay");
  if (!drawer || !overlay) return; // page has no cart UI (shouldn't happen on menu.html)

  const openBtn = document.getElementById("cart-open-btn");
  const stickyBtn = document.getElementById("sticky-cart-btn");
  const closeBtn = document.getElementById("cart-close-btn");
  const checkoutBtn = document.getElementById("checkout-btn");
  const checkoutBackBtn = document.getElementById("checkout-back-btn");
  const checkoutCloseBtn = document.getElementById("checkout-close-btn");
  const guestForm = document.getElementById("guest-form");

  const openDrawer = () => {
    showCartView();
    drawer.classList.add("open");
    overlay.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };
  const closeDrawer = () => {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  openBtn?.addEventListener("click", openDrawer);
  stickyBtn?.addEventListener("click", openDrawer);
  closeBtn?.addEventListener("click", closeDrawer);
  checkoutCloseBtn?.addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);

  checkoutBtn?.addEventListener("click", () => {
    if (CartStore.getTotalItems() === 0) return;
    if (!isOrderingOpen()) {
      showToast("Room service is closed right now. Hours: 7:00 AM – 10:30 PM.");
      return;
    }
    showCheckoutView();
  });
  checkoutBackBtn?.addEventListener("click", showCartView);

  guestForm?.addEventListener("submit", handlePlaceOrder);

  // Keep badges, sticky bar, and the open drawer's item list all in sync.
  CartStore.subscribe((cart) => {
    renderCartBadges(cart);
    renderCartItems(cart);
    renderStickyBar(cart);
  });

  updateHoursBanner();
  setInterval(updateHoursBanner, 60 * 1000); // re-check as the clock crosses 7:00/22:30
}

function updateHoursBanner() {
  const banner = document.getElementById("hours-banner");
  if (!banner) return;
  banner.hidden = isOrderingOpen();
}

function showCartView() {
  document.getElementById("cart-view").hidden = false;
  document.getElementById("checkout-view").hidden = true;
  document.getElementById("success-view").hidden = true;
}
function showCheckoutView() {
  document.getElementById("cart-view").hidden = true;
  document.getElementById("checkout-view").hidden = false;
  document.getElementById("success-view").hidden = true;
  const { grandTotal } = CartStore.getTotals(GST_RATE);
  document.getElementById("checkout-grand").textContent = `₹${grandTotal}`;
  document.getElementById("guest-form-error").hidden = true;
}
function showSuccessView() {
  document.getElementById("cart-view").hidden = true;
  document.getElementById("checkout-view").hidden = true;
  document.getElementById("success-view").hidden = false;
}

function renderCartBadges(cart) {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById("cart-badge");
  if (badge) {
    badge.textContent = count;
    badge.hidden = count === 0;
  }
}

function renderStickyBar(cart) {
  const bar = document.getElementById("sticky-cart-btn");
  if (!bar) return;
  const { totalItems, grandTotal } = CartStore.getTotals(GST_RATE);
  bar.hidden = totalItems === 0;
  document.getElementById("sticky-cart-badge").textContent = totalItems;
  document.getElementById("sticky-cart-total").textContent = `₹${grandTotal}`;
}

function renderCartItems(cart) {
  const list = document.getElementById("cart-items");
  const emptyState = document.getElementById("cart-empty-state");
  const summary = document.getElementById("cart-summary");
  if (!list) return;

  if (!cart.length) {
    list.innerHTML = "";
    emptyState.hidden = false;
    summary.hidden = true;
    return;
  }
  emptyState.hidden = true;
  summary.hidden = false;

  list.innerHTML = cart
    .map(
      (item) => `
      <div class="cart-line" data-id="${item.id}">
        <div class="cart-line-media">${
          item.image
            ? `<img src="${item.image}" alt="${item.name}">`
            : `<div class="plate-placeholder"><span>🍽️</span></div>`
        }</div>
        <div class="cart-line-body">
          <h5>${item.name}</h5>
          <span class="cart-line-price">₹${item.price} each</span>
          <div class="qty-stepper">
            <button class="qty-btn" data-action="dec" aria-label="Decrease quantity">−</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" data-action="inc" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="cart-line-side">
          <span class="cart-line-subtotal">₹${item.price * item.qty}</span>
          <button class="cart-line-remove" data-action="remove" aria-label="Remove ${item.name}">Remove</button>
        </div>
      </div>`
    )
    .join("");

  list.querySelectorAll(".qty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".cart-line").dataset.id;
      CartStore.updateQty(id, btn.dataset.action === "inc" ? 1 : -1);
    });
  });
  list.querySelectorAll(".cart-line-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".cart-line").dataset.id;
      CartStore.removeItem(id);
    });
  });

  const { totalItems, subtotal, gst, grandTotal } = CartStore.getTotals(GST_RATE);
  document.getElementById("sum-items").textContent = totalItems;
  document.getElementById("sum-subtotal").textContent = `₹${subtotal}`;
  document.getElementById("sum-gst").textContent = `₹${gst}`;
  document.getElementById("sum-grand").textContent = `₹${grandTotal}`;
  const gstRow = document.getElementById("sum-gst-row");
  if (gstRow) gstRow.hidden = GST_RATE <= 0;
}

async function handlePlaceOrder(e) {
  e.preventDefault();
  const errorEl = document.getElementById("guest-form-error");
  const guestName = document.getElementById("guest-name").value.trim();
  const roomNumber = document.getElementById("room-number").value.trim();
  const mobile = document.getElementById("guest-mobile").value.trim();
  const note = document.getElementById("guest-note").value.trim();

  if (!guestName || !roomNumber) {
    errorEl.textContent = "Please enter your name and room number.";
    errorEl.hidden = false;
    return;
  }

  if (!isOrderingOpen()) {
    errorEl.textContent = "Room service is closed right now. Ordering hours are 7:00 AM – 10:30 PM.";
    errorEl.hidden = false;
    return;
  }

  if (isRateLimited()) {
    errorEl.textContent = "You've placed a couple of orders already — please wait a minute before ordering again.";
    errorEl.hidden = false;
    return;
  }

  const cart = CartStore.getCart();
  if (!cart.length) {
    errorEl.textContent = "Your cart is empty.";
    errorEl.hidden = false;
    return;
  }

  const items = cart.map((i) => ({
    name: i.name,
    price: i.price,
    qty: i.qty,
    subtotal: i.price * i.qty,
  }));

  const submitBtn = document.getElementById("place-order-btn");
  const label = document.getElementById("place-order-label");
  const spinner = document.getElementById("place-order-spinner");
  submitBtn.disabled = true;
  label.textContent = "Placing Order…";
  spinner.hidden = false;
  errorEl.hidden = true;

  try {
    const { placeOrder } = await import("./firebase.js");
    const orderId = await placeOrder({ guestName, roomNumber, mobile, note, items });
    recordOrderTimestamp();
    CartStore.clearCart();
    showSuccessView();
    setTimeout(() => {
      window.location.href = `thank-you.html?order=${encodeURIComponent(orderId)}`;
    }, 1600);
  } catch (err) {
    console.error(err);
    errorEl.textContent = "Could not place your order. Please check your connection and try again.";
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
    label.textContent = "Order Now";
    spinner.hidden = true;
  }
}

/* ------------------------------ Toast ------------------------------ */
let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}
