/* ==============================================================
   app.js — Sanskar Grand · Homepage behaviour
   Handles: loading screen, sticky navbar, mobile nav, scroll
   reveals, hero parallax, ripple buttons, and pulling Chef
   Special / Best Seller / Category tiles from the shared menu
   data so nothing on the homepage is hand-typed twice.
   ============================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initLoadingScreen();
  initNavbar();
  initMobileNav();
  initRipple();
  initScrollReveal();
  initParallax();
  initFooterYear();
  loadHomepageMenuData();
});

/* ---------------------- Loading Screen ------------------------ */
function initLoadingScreen() {
  const loader = document.getElementById("loading-screen");
  if (!loader) return;
  window.addEventListener("load", () => {
    // small deliberate pause so the crest animation is felt, not skipped
    setTimeout(() => loader.classList.add("hidden"), 500);
  });
}

/* -------------------------- Navbar ----------------------------- */
function initNavbar() {
  const nav = document.querySelector(".navbar");
  if (!nav) return;
  const toggleState = () => {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  };
  toggleState();
  window.addEventListener("scroll", toggleState, { passive: true });
}

function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => {
    toggle.classList.toggle("open");
    links.classList.toggle("open");
  });
  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      toggle.classList.remove("open");
      links.classList.remove("open");
    });
  });
}

/* ---------------------- Ripple on buttons ----------------------- */
function initRipple() {
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      const rect = this.getBoundingClientRect();
      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height);
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  });
}

/* ----------------------- Scroll Reveal --------------------------- */
function initScrollReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );

  items.forEach((el) => observer.observe(el));
}

/* ------------------------ Hero Parallax --------------------------- */
function initParallax() {
  const layer = document.querySelector(".hero-parallax-layer");
  const cards = document.querySelectorAll(".hero-card");
  if (!layer) return;

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        layer.style.transform = `translateY(${y * 0.25}px)`;
        cards.forEach((card, i) => {
          card.style.transform += ` translateY(${y * (0.04 + i * 0.02)}px)`;
        });
        ticking = false;
      });
    },
    { passive: true }
  );
}

/* ------------------------- Footer Year ----------------------------- */
function initFooterYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

/* =================================================================
   Dynamic homepage content — Chef Special, Best Seller, Categories
   pulled live from SanskarDB so the homepage never drifts out of
   sync with the menu the kitchen actually edits in /admin.html
   ================================================================= */
async function loadHomepageMenuData() {
  try {
    const menu = await SanskarDB.getMenu();

    renderDishGrid(
      document.getElementById("chef-special-grid"),
      menu.items.filter((i) => i.chefSpecial && i.available).slice(0, 3),
      "Chef's Special"
    );

    renderDishGrid(
      document.getElementById("best-seller-grid"),
      menu.items.filter((i) => i.bestseller && i.available).slice(0, 3),
      "Best Seller"
    );

    renderCategoryTiles(document.getElementById("category-grid"), menu.categories, menu.items);
  } catch (err) {
    console.error("Could not load menu data for homepage:", err);
  }
}

function renderDishGrid(container, dishes, ribbonLabel) {
  if (!container) return;
  if (!dishes.length) {
    container.innerHTML = `<p class="section-sub">More dishes coming soon.</p>`;
    return;
  }
  container.innerHTML = dishes
    .map(
      (dish, i) => `
      <article class="dish-card reveal reveal-delay-${(i % 3) + 1}">
        <div class="dish-media">
          ${window.dishMedia(dish)}
          <span class="ribbon">${ribbonLabel}</span>
        </div>
        <div class="dish-body">
          <h4>${dish.name}<span class="price">₹${dish.price}</span></h4>
          <p>${dish.description}</p>
        </div>
      </article>`
    )
    .join("");
}

function renderCategoryTiles(container, categories, items) {
  if (!container) return;
  container.innerHTML = categories
    .map((cat, i) => {
      const count = items.filter((it) => it.category === cat.id).length;
      return `
      <a href="menu.html?category=${cat.id}" class="cat-tile reveal reveal-delay-${(i % 3) + 1}">
        <div class="icon">${cat.icon}</div>
        <h5>${cat.name}</h5>
        <span>${count} dishes</span>
      </a>`;
    })
    .join("");
  // categories were injected after the initial observer ran — re-scan
  initScrollReveal();
}

/**
 * Note: foodPlaceholder() and dishMedia() now live in js/storage.js
 * (loaded before this file) so every page shares one definition and
 * never drifts out of sync again.
 */
