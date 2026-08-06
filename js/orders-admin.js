/* ==============================================================
   orders-admin.js — Sanskar Grand · Admin "Orders" panel
   Type="module" script: talks to Firebase directly through
   firebase.js. Independent of the existing admin.js / SanskarDB
   password gate — this panel has its own Firebase Authentication
   sign-in, because that's what the Firestore security rules
   actually check (see firestore.rules).
   ============================================================== */

import {
  watchAdminAuth,
  adminSignIn,
  adminSignOut,
  listenToOrders,
  updateOrderStatus,
  deleteOrder,
} from "./firebase.js";

const STATUSES = ["Pending", "Preparing", "Ready", "Delivered", "Cancelled"];

let allOrders = [];
let unsubscribeOrders = null;
let filters = { room: "", guest: "", status: "all", sort: "desc" };

document.addEventListener("DOMContentLoaded", () => {
  wireLoginForm();
  wireToolbar();
  wireSignOut();

  watchAdminAuth((user) => {
    if (user) {
      showOrdersDashboard(user);
    } else {
      showOrdersLogin();
    }
  });
});

/* ------------------------- Auth gate ------------------------- */

function wireLoginForm() {
  const form = document.getElementById("orders-login-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("orders-email").value.trim();
    const password = document.getElementById("orders-password").value;
    const errorEl = document.getElementById("orders-login-error");
    errorEl.textContent = "";
    try {
      await adminSignIn(email, password);
    } catch (err) {
      console.error(err);
      errorEl.textContent = "Sign-in failed. Check the email and password and try again.";
    }
  });
}

function wireSignOut() {
  const btn = document.getElementById("orders-signout-btn");
  if (!btn) return;
  btn.addEventListener("click", () => adminSignOut());
}

function showOrdersLogin() {
  document.getElementById("orders-auth-gate").style.display = "block";
  document.getElementById("orders-dashboard").style.display = "none";
  if (unsubscribeOrders) {
    unsubscribeOrders();
    unsubscribeOrders = null;
  }
}

function showOrdersDashboard(user) {
  document.getElementById("orders-auth-gate").style.display = "none";
  document.getElementById("orders-dashboard").style.display = "block";
  document.getElementById("orders-signed-in-as").textContent =
    `Signed in as ${user.email} · updates in real time, no refresh needed.`;

  if (unsubscribeOrders) unsubscribeOrders();
  unsubscribeOrders = listenToOrders(
    (orders) => {
      allOrders = orders;
      renderOrders();
    },
    (err) => {
      console.error(err);
      const grid = document.getElementById("orders-grid");
      grid.innerHTML = `<div class="empty-state"><div class="glyph">⚠️</div><p>Could not load orders. Check your Firestore rules and connection.</p></div>`;
    }
  );
}

/* ------------------------- Toolbar ------------------------- */

function wireToolbar() {
  const roomInput = document.getElementById("orders-search-room");
  const guestInput = document.getElementById("orders-search-guest");
  const statusSelect = document.getElementById("orders-status-filter");
  const sortSelect = document.getElementById("orders-sort");

  roomInput?.addEventListener("input", () => {
    filters.room = roomInput.value.trim().toLowerCase();
    renderOrders();
  });
  guestInput?.addEventListener("input", () => {
    filters.guest = guestInput.value.trim().toLowerCase();
    renderOrders();
  });
  statusSelect?.addEventListener("change", () => {
    filters.status = statusSelect.value;
    renderOrders();
  });
  sortSelect?.addEventListener("change", () => {
    filters.sort = sortSelect.value;
    renderOrders();
  });
}

/* ------------------------- Rendering ------------------------- */

function getFilteredOrders() {
  let list = allOrders.filter((o) => {
    if (filters.room && !(o.roomNumber || "").toLowerCase().includes(filters.room)) return false;
    if (filters.guest && !(o.guestName || "").toLowerCase().includes(filters.guest)) return false;
    if (filters.status !== "all" && o.status !== filters.status) return false;
    return true;
  });
  // allOrders already comes ordered desc (newest first) from Firestore;
  // reverse a copy for "oldest first" without touching the source array.
  if (filters.sort === "asc") list = [...list].reverse();
  return list;
}

function renderOrders() {
  const grid = document.getElementById("orders-grid");
  const emptyState = document.getElementById("orders-empty-state");
  if (!grid) return;

  const orders = getFilteredOrders();
  emptyState.hidden = orders.length > 0;
  grid.hidden = orders.length === 0;

  grid.innerHTML = orders.map(renderOrderCard).join("");

  grid.querySelectorAll(".status-select").forEach((select) => {
    select.addEventListener("change", async () => {
      const id = select.dataset.id;
      const prevValue = select.dataset.current;
      select.disabled = true;
      try {
        await updateOrderStatus(id, select.value);
      } catch (err) {
        console.error(err);
        select.value = prevValue;
        alert("Could not update status. Please try again.");
      } finally {
        select.disabled = false;
      }
    });
  });

  grid.querySelectorAll(".order-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this order permanently?")) return;
      btn.disabled = true;
      try {
        await deleteOrder(btn.dataset.id);
      } catch (err) {
        console.error(err);
        alert("Could not delete this order. Please try again.");
        btn.disabled = false;
      }
    });
  });
}

function renderOrderCard(order) {
  const itemsHtml = (order.items || [])
    .map((i) => `<li><span>${i.name} <em>× ${i.qty}</em></span><span>₹${i.subtotal}</span></li>`)
    .join("");

  const time = formatOrderTime(order.createdAt);
  const statusOptions = STATUSES.map(
    (s) => `<option value="${s}" ${s === order.status ? "selected" : ""}>${s}</option>`
  ).join("");

  const canDelete = order.status === "Delivered" || order.status === "Cancelled";

  return `
    <article class="order-card">
      <div class="order-card-head">
        <div>
          <div class="order-room">Room ${escapeHtml(order.roomNumber || "—")}</div>
          <div class="order-guest">${escapeHtml(order.guestName || "Guest")}</div>
        </div>
        <span class="status-badge status-${order.status}">${order.status}</span>
      </div>

      <ul class="order-items-list">${itemsHtml}</ul>

      ${order.note ? `<p class="order-note">📝 ${escapeHtml(order.note)}</p>` : ""}

      <div class="order-card-foot">
        <div class="order-meta">
          <span class="order-total">Total ₹${order.totalAmount ?? 0}</span>
          <span class="order-time">${time}</span>
          ${order.mobile ? `<a href="tel:${escapeHtml(order.mobile)}" class="order-mobile">📞 ${escapeHtml(order.mobile)}</a>` : ""}
        </div>
        <div class="order-actions">
          <select class="status-select" data-id="${order.id}" data-current="${order.status}">${statusOptions}</select>
          ${canDelete ? `<button class="order-delete-btn" data-id="${order.id}">Delete</button>` : ""}
        </div>
      </div>
    </article>`;
}

function formatOrderTime(createdAt) {
  // serverTimestamp() resolves a moment after the write, so the very
  // first onSnapshot echo of a brand-new order may have a null value.
  if (!createdAt || typeof createdAt.toDate !== "function") return "Just now";
  return createdAt.toDate().toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
