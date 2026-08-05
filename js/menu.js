/* ==============================================================
   menu.js — Sanskar Grand · Full Menu Page behaviour
   Owns: loading the shared menu data, live search, category
   filtering, grid/list view, dark-mode toggle, and favoriting.
   Rendering always starts from the full item list in memory, so
   filters simply recompute a "visible" subset and re-render —
   no separate DOM state to keep in sync.
   ============================================================== */

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
}
