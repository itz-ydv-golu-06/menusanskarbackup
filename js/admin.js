/* ==============================================================
   admin.js — Sanskar Grand · Admin Panel behaviour
   Everything here reads/writes through SanskarDB (storage.js) so
   the admin panel, homepage and menu page always agree on what
   "the menu" currently is. No server, no build step — just
   localStorage acting as the live database and menu.json as seed
   data / reset target / downloadable export.
   ============================================================== */

let MENU = null;          // working copy of the full menu object
let editingItemId = null; // null = "add" mode, otherwise "edit" mode
let pendingImageData = ""; // base64 image staged in the item modal

document.addEventListener("DOMContentLoaded", () => {
  if (SanskarDB.isLoggedIn()) {
    showDashboard();
  } else {
    showLogin();
  }
  wireLoginForm();
});

/* ============================================================
   Login / Logout
   ============================================================ */
function wireLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const pass = document.getElementById("password-input").value;
    const errorEl = document.getElementById("login-error");
    if (SanskarDB.login(pass)) {
      errorEl.textContent = "";
      showDashboard();
    } else {
      errorEl.textContent = "Incorrect password. Please try again.";
    }
  });

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      SanskarDB.logout();
      showLogin();
    });
  }
}

function showLogin() {
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("admin-shell").style.display = "none";
}

async function showDashboard() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("admin-shell").style.display = "grid";
  MENU = await SanskarDB.getMenu();
  initSidebarNav();
  wireItemModal();
  wireDataTools();
  wireCategoryTools();
  renderAll();
}

/* ============================================================
   Sidebar navigation between panels
   ============================================================ */
function initSidebarNav() {
  const buttons = document.querySelectorAll(".side-nav button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".admin-panel").forEach((p) => p.classList.remove("active"));
      document.getElementById(`panel-${btn.dataset.panel}`).classList.add("active");
    });
  });
}

/* ============================================================
   Render everything from the in-memory MENU object
   ============================================================ */
function renderAll() {
  renderStats();
  renderItemsTable();
  renderCategoryManager();
  populateCategorySelect();
}

function renderStats() {
  const total = MENU.items.length;
  const available = MENU.items.filter((i) => i.available).length;
  const bestsellers = MENU.items.filter((i) => i.bestseller).length;
  const specials = MENU.items.filter((i) => i.chefSpecial).length;
  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-available").textContent = available;
  document.getElementById("stat-bestseller").textContent = bestsellers;
  document.getElementById("stat-special").textContent = specials;
}

function catName(catId) {
  const cat = MENU.categories.find((c) => c.id === catId);
  return cat ? cat.name : catId;
}

function renderItemsTable() {
  const tbody = document.getElementById("items-table-body");
  const search = (document.getElementById("admin-search")?.value || "").toLowerCase();
  const items = MENU.items.filter((i) => i.name.toLowerCase().includes(search));

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px;">No items found.</td></tr>`;
    return;
  }

  tbody.innerHTML = items
    .map(
      (item) => `
    <tr data-id="${item.id}">
      <td>
        <div class="thumb">
          ${window.dishMedia(item)}
        </div>
      </td>
      <td><strong>${item.name}</strong><br><span class="tag-pill">${item.veg ? "Veg" : "Non-Veg"}</span></td>
      <td>${catName(item.category)}</td>
      <td>₹${item.price}</td>
      <td>
        <div class="switch ${item.available ? "on" : ""}" data-action="toggle-available" title="Toggle availability"></div>
      </td>
      <td style="display:flex; gap:6px; flex-wrap:wrap;">
        <span class="tag-pill ${item.bestseller ? "on" : ""}" data-action="toggle-bestseller" style="cursor:pointer;">Best Seller</span>
        <span class="tag-pill ${item.chefSpecial ? "on" : ""}" data-action="toggle-chefspecial" style="cursor:pointer;">Chef Special</span>
      </td>
      <td>
        <div class="row-actions">
          <button data-action="edit" title="Edit item">✎</button>
          <button data-action="delete" class="danger" title="Delete item">🗑</button>
        </div>
      </td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll("tr").forEach((row) => {
    const id = row.dataset.id;
    row.querySelector('[data-action="toggle-available"]').addEventListener("click", () => toggleField(id, "available"));
    row.querySelector('[data-action="toggle-bestseller"]').addEventListener("click", () => toggleField(id, "bestseller"));
    row.querySelector('[data-action="toggle-chefspecial"]').addEventListener("click", () => toggleField(id, "chefSpecial"));
    row.querySelector('[data-action="edit"]').addEventListener("click", () => openItemModal(id));
    row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteItemFlow(id));
  });
}

async function toggleField(id, field) {
  const item = MENU.items.find((i) => i.id === id);
  if (!item) return;
  item[field] = !item[field];
  MENU = await SanskarDB.upsertItem(item);
  renderAll();
  showToast(`${item.name} updated.`);
}

async function deleteItemFlow(id) {
  const item = MENU.items.find((i) => i.id === id);
  if (!item) return;
  if (!confirm(`Delete "${item.name}" from the menu? This cannot be undone.`)) return;
  MENU = await SanskarDB.deleteItem(id);
  renderAll();
  showToast(`${item.name} deleted.`);
}

/* ============================================================
   Add / Edit item modal
   ============================================================ */
function wireItemModal() {
  document.getElementById("add-item-btn").addEventListener("click", () => openItemModal(null));
  document.getElementById("modal-close-btn").addEventListener("click", closeItemModal);
  document.getElementById("modal-cancel-btn").addEventListener("click", closeItemModal);
  document.getElementById("item-form").addEventListener("submit", saveItemFlow);
  document.getElementById("admin-search").addEventListener("input", renderItemsTable);

  const dropzone = document.getElementById("image-drop");
  const fileInput = document.getElementById("image-input");
  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => handleImageFile(e.target.files[0]));
  dropzone.addEventListener("dragover", (e) => e.preventDefault());
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]);
  });
}

function handleImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    pendingImageData = reader.result; // base64 data URL, stored directly in menu.json/localStorage
    document.getElementById("image-drop").innerHTML = `<img src="${pendingImageData}" alt="Preview"><p>Click to replace image</p>`;
  };
  reader.readAsDataURL(file);
}

function populateCategorySelect() {
  const select = document.getElementById("item-category");
  select.innerHTML = MENU.categories.map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join("");
}

function openItemModal(id) {
  editingItemId = id;
  pendingImageData = "";
  const form = document.getElementById("item-form");
  form.reset();
  populateCategorySelect();
  document.getElementById("image-drop").innerHTML = `<p>Click or drop an image here</p>`;

  if (id) {
    const item = MENU.items.find((i) => i.id === id);
    document.getElementById("modal-title").textContent = "Edit Menu Item";
    document.getElementById("item-name").value = item.name;
    document.getElementById("item-category").value = item.category;
    document.getElementById("item-price").value = item.price;
    document.getElementById("item-description").value = item.description;
    document.getElementById("item-veg").checked = item.veg;
    document.getElementById("item-available").checked = item.available;
    document.getElementById("item-bestseller").checked = item.bestseller;
    document.getElementById("item-chefspecial").checked = item.chefSpecial;
    if (item.image) {
      pendingImageData = item.image;
      document.getElementById("image-drop").innerHTML = `<img src="${item.image}" alt="Preview"><p>Click to replace image</p>`;
    }
  } else {
    document.getElementById("modal-title").textContent = "Add Menu Item";
    document.getElementById("item-veg").checked = true;
    document.getElementById("item-available").checked = true;
  }

  document.getElementById("item-modal").classList.add("open");
}

function closeItemModal() {
  document.getElementById("item-modal").classList.remove("open");
  editingItemId = null;
}

async function saveItemFlow(e) {
  e.preventDefault();
  const name = document.getElementById("item-name").value.trim();
  const category = document.getElementById("item-category").value;
  const price = Number(document.getElementById("item-price").value);
  const description = document.getElementById("item-description").value.trim();
  const veg = document.getElementById("item-veg").checked;
  const available = document.getElementById("item-available").checked;
  const bestseller = document.getElementById("item-bestseller").checked;
  const chefSpecial = document.getElementById("item-chefspecial").checked;

  if (!name || !category || !price) {
    showToast("Please fill in name, category and price.");
    return;
  }

  const item = {
    id: editingItemId || generateId(name),
    name, category, price, description, veg, available, bestseller, chefSpecial,
    image: pendingImageData || ""
  };

  MENU = await SanskarDB.upsertItem(item);
  closeItemModal();
  renderAll();
  showToast(`${name} saved.`);
}

function generateId(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${slug}-${Date.now().toString(36).slice(-4)}`;
}

/* ============================================================
   Category manager
   ============================================================ */
function renderCategoryManager() {
  const wrap = document.getElementById("category-list");
  wrap.innerHTML = MENU.categories
    .map(
      (cat) => `
    <div class="category-row" data-id="${cat.id}">
      <span class="icon-preview">${cat.icon}</span>
      <input type="text" value="${cat.name}" data-field="name" aria-label="Category name" />
      <input type="text" value="${cat.icon}" data-field="icon" style="max-width:70px;" aria-label="Category icon" />
      <button class="icon-btn" data-action="save-cat" title="Save category">💾</button>
    </div>`
    )
    .join("");

  wrap.querySelectorAll(".category-row").forEach((row) => {
    row.querySelector('[data-action="save-cat"]').addEventListener("click", async () => {
      const id = row.dataset.id;
      const name = row.querySelector('[data-field="name"]').value.trim();
      const icon = row.querySelector('[data-field="icon"]').value.trim();
      MENU = await SanskarDB.upsertCategory({ id, name, icon });
      renderAll();
      showToast(`Category "${name}" updated.`);
    });
  });
}

function wireCategoryTools() {
  document.getElementById("add-category-btn").addEventListener("click", async () => {
    const name = prompt("New category name (e.g. Tandoori Grills):");
    if (!name) return;
    const icon = prompt("Pick an emoji icon for this category (e.g. 🔥):", "🍽️") || "🍽️";
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    MENU = await SanskarDB.upsertCategory({ id, name, icon });
    renderAll();
    showToast(`Category "${name}" added.`);
  });
}

/* ============================================================
   Data tools: Preview / Export / Import / Reset
   ============================================================ */
function wireDataTools() {
  document.getElementById("preview-btn").addEventListener("click", () => {
    window.open("menu.html", "_blank");
  });

  document.getElementById("export-btn").addEventListener("click", () => {
    SanskarDB.exportJSON(MENU);
    showToast("menu.json downloaded. Commit this file to update GitHub Pages.");
  });

  document.getElementById("import-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      MENU = await SanskarDB.importJSON(file);
      renderAll();
      showToast("Menu imported successfully.");
    } catch (err) {
      showToast("That file could not be read as valid JSON.");
    }
    e.target.value = "";
  });

  document.getElementById("reset-btn").addEventListener("click", async () => {
    if (!confirm("Reset the menu back to the original data/menu.json? All admin edits will be lost.")) return;
    MENU = await SanskarDB.resetMenu();
    renderAll();
    showToast("Menu reset to defaults.");
  });
}

/* ============================================================
   Toast helper
   ============================================================ */
let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

/* foodPlaceholder() and dishMedia() now live in js/storage.js and are
   shared by every page, so admin.html no longer needs its own copy. */
