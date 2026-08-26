/* ============================================================
   storage.js
   Shared "offline database" layer for Sanskar Grand.
   Every page (home, menu, admin) talks to the menu data only
   through the functions in this file — nothing else touches
   localStorage or fetch() directly. This keeps the JSON schema
   in one place and makes the whole site work with zero backend.
   ============================================================ */

/* ==============================================================
   Shared dish visual renderer
   Every page (home, menu, admin) was previously carrying its own
   copy of this logic, and the menu.html copy never actually
   checked for a real uploaded photo — it always drew the CSS
   placeholder. Centralizing it here fixes that for good: every
   page now shows the real image the moment item.image is set,
   and only falls back to the placeholder icon when it's empty.
   ============================================================== */
const CATEGORY_ICONS = {
  starters: "🥟", "raitas-salads": "🥗", breakfast: "🍳", soups: "🍲",
  "main-course": "🍛", chinese: "🥡", "rice-noodles": "🍚",
  beverages: "🥤", breads: "🫓", desserts: "🍮"
};

function foodPlaceholder(name, category) {
  const icon = CATEGORY_ICONS[category] || "🍽️";
  return `<div class="plate-placeholder" role="img" aria-label="${name}"><span>${icon}</span></div>`;
}

/** Renders the real uploaded photo when present, otherwise the placeholder. */
function dishMedia(item) {
  if (item.image) {
    return `<img src="${item.image}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;">`;
  }
  return foodPlaceholder(item.name, item.category);
}

window.foodPlaceholder = foodPlaceholder;
window.dishMedia = dishMedia;

const SanskarDB = (() => {
  // Keys used in localStorage. Namespaced so we never collide
  // with anything else that might live on the same origin.
  const KEYS = {
    MENU: "sg_menu_data",       // full { restaurant, categories, items } object
    FAVORITES: "sg_favorites",  // array of item ids the visitor liked
    THEME: "sg_theme",          // "light" | "dark"
    ADMIN_AUTH: "sg_admin_auth" // "1" while an admin session is active
  };

  // Path to the source-of-truth JSON shipped with the repo.
  const MENU_JSON_PATH = "data/menu.json";

  /**
   * Fetch the baseline menu.json file from disk.
   * Used the very first time a browser visits the site, or
   * whenever the admin chooses "Reset Menu".
   */
  async function fetchDefaultMenu() {
    const response = await fetch(MENU_JSON_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load data/menu.json");
    }
    return response.json();
  }

  /**
   * Get the current menu data. localStorage is treated as the
   * live database; menu.json is only the seed/reset data.
   * Falls back to fetching menu.json the first time.
   */
  async function getMenu() {
    const cached = localStorage.getItem(KEYS.MENU);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        console.warn("Corrupt cached menu, reloading default.", err);
      }
    }
    const fresh = await fetchDefaultMenu();
    trySaveMenu(fresh);
    return fresh;
  }

  /** Persist a full menu object back into localStorage.
   *  The menu (with embedded base64 photos) can be several MB, which
   *  exceeds Safari/iOS's localStorage quota (often ~5MB, sometimes far
   *  less in Private Browsing or Low Power Mode). A failed write here
   *  must never break the page — it just means this device won't get
   *  the offline/instant-load cache for this visit. */
  function trySaveMenu(menuData) {
    try {
      localStorage.setItem(KEYS.MENU, JSON.stringify(menuData));
      return true;
    } catch (err) {
      console.warn("Could not cache menu in localStorage (quota?). Continuing without cache.", err);
      try { localStorage.removeItem(KEYS.MENU); } catch {}
      return false;
    }
  }
  function saveMenu(menuData) {
    trySaveMenu(menuData);
  }

  /** Wipe the cached menu so the next getMenu() re-reads menu.json. */
  async function resetMenu() {
    localStorage.removeItem(KEYS.MENU);
    const fresh = await fetchDefaultMenu();
    trySaveMenu(fresh);
    return fresh;
  }

  /** Add, update or remove a single item, then persist. */
  async function upsertItem(item) {
    const menu = await getMenu();
    const index = menu.items.findIndex((i) => i.id === item.id);
    if (index === -1) {
      menu.items.push(item);
    } else {
      menu.items[index] = item;
    }
    saveMenu(menu);
    return menu;
  }

  async function deleteItem(itemId) {
    const menu = await getMenu();
    menu.items = menu.items.filter((i) => i.id !== itemId);
    saveMenu(menu);
    return menu;
  }

  async function upsertCategory(category) {
    const menu = await getMenu();
    const index = menu.categories.findIndex((c) => c.id === category.id);
    if (index === -1) {
      menu.categories.push(category);
    } else {
      menu.categories[index] = category;
    }
    saveMenu(menu);
    return menu;
  }

  /* ---------------------- Favorites ---------------------- */

  function getFavorites() {
    const raw = localStorage.getItem(KEYS.FAVORITES);
    return raw ? JSON.parse(raw) : [];
  }

  function toggleFavorite(itemId) {
    const favs = getFavorites();
    const idx = favs.indexOf(itemId);
    if (idx === -1) {
      favs.push(itemId);
    } else {
      favs.splice(idx, 1);
    }
    localStorage.setItem(KEYS.FAVORITES, JSON.stringify(favs));
    return favs;
  }

  function isFavorite(itemId) {
    return getFavorites().includes(itemId);
  }

  /* ------------------------ Theme ------------------------- */

  function getTheme() {
    return localStorage.getItem(KEYS.THEME) || "dark";
  }

  function setTheme(theme) {
    localStorage.setItem(KEYS.THEME, theme);
  }

  /* ------------------------ Admin -------------------------- */

  // NOTE: this is a lightweight front-end gate for a static demo
  // site, not real authentication — there is no server to guard.
  const ADMIN_PASSWORD = "G@lu1805";

  function login(password) {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(KEYS.ADMIN_AUTH, "1");
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(KEYS.ADMIN_AUTH);
  }

  function isLoggedIn() {
    return sessionStorage.getItem(KEYS.ADMIN_AUTH) === "1";
  }

  /* ------------------- Import / Export ---------------------- */

  function exportJSON(menuData) {
    const blob = new Blob([JSON.stringify(menuData, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          saveMenu(data);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // Public API
  return {
    getMenu,
    saveMenu,
    resetMenu,
    upsertItem,
    deleteItem,
    upsertCategory,
    getFavorites,
    toggleFavorite,
    isFavorite,
    getTheme,
    setTheme,
    login,
    logout,
    isLoggedIn,
    exportJSON,
    importJSON
  };
})();
