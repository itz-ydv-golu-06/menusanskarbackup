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
let isFirstSnapshot = true; // don't alert for orders that already existed when we signed in

document.addEventListener("DOMContentLoaded", () => {
  wireLoginForm();
  wireToolbar();
  wireSignOut();
  wireAlertToggles();

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
    unlockAudio(); // form submit is a user gesture — safe place to unlock playback
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

  isFirstSnapshot = true;
  if (unsubscribeOrders) unsubscribeOrders();
  unsubscribeOrders = listenToOrders(
    (orders, docChanges) => {
      allOrders = orders;
      if (!isFirstSnapshot) {
        const newOrders = docChanges
          .filter((c) => c.type === "added")
          .map((c) => ({ id: c.doc.id, ...c.doc.data() }));
        if (newOrders.length) handleNewOrders(newOrders);
      }
      isFirstSnapshot = false;
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

/* ==================================================================
   New-order alerts — sound chime + Windows/desktop & mobile notification
   ================================================================== */

const SOUND_PREF_KEY = "sg_admin_sound_enabled";
const NOTIFY_PREF_KEY = "sg_admin_notify_enabled";

let audioCtx = null;

function isSoundEnabled() {
  return localStorage.getItem(SOUND_PREF_KEY) !== "off"; // on by default
}
function isNotifyEnabled() {
  return localStorage.getItem(NOTIFY_PREF_KEY) === "on"; // off by default (needs permission)
}

/** Call from a real user gesture (click/submit) — browsers block audio otherwise. */
function unlockAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}

/** A loud, urgent "ring-ring… ring-ring" phone-style alert — synthesized,
 *  no audio file needed, so it always works, including inside the wrapped
 *  Median app. Square-wave trill instead of a soft sine tone, at close to
 *  full volume, repeated twice so it's hard to miss over kitchen noise. */
function playNewOrderChime() {
  unlockAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  const master = audioCtx.createGain();
  master.gain.value = 0.9; // loud
  master.connect(audioCtx.destination);

  function ringBurst(startTime, duration) {
    const osc = audioCtx.createOscillator();
    osc.type = "square"; // more piercing/alarm-like than a plain sine tone

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, now + startTime);
    gain.gain.linearRampToValueAtTime(1, now + startTime + 0.02);
    gain.gain.setValueAtTime(1, now + startTime + duration - 0.03);
    gain.gain.linearRampToValueAtTime(0.0001, now + startTime + duration);
    osc.connect(gain).connect(master);

    // Classic phone-ring "trill" — fast alternation between two pitches.
    let t = 0;
    let high = true;
    while (t < duration) {
      osc.frequency.setValueAtTime(high ? 1400 : 950, now + startTime + t);
      high = !high;
      t += 0.09;
    }

    osc.start(now + startTime);
    osc.stop(now + startTime + duration + 0.02);
  }

  // "ring-ring … ring-ring" — two rings, a pause, two more rings.
  ringBurst(0, 0.45);
  ringBurst(0.6, 0.45);
  ringBurst(1.4, 0.45);
  ringBurst(1.95, 0.45);
}

function showDesktopNotification(order) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const itemsSummary = (order.items || []).map((i) => `${i.name} ×${i.qty}`).join(", ");
  const notif = new Notification("🛎️ New Order — Room " + (order.roomNumber || "—"), {
    body: `${order.guestName || "Guest"} · ${itemsSummary}\nTotal ₹${order.totalAmount ?? 0}`,
    icon: "icons/pwa/icon-192.png",
    tag: "sg-order-" + order.id, // avoids piling up duplicate notifications for the same order
  });
  notif.onclick = () => {
    window.focus();
    notif.close();
  };
}

function handleNewOrders(newOrders) {
  if (isSoundEnabled()) playNewOrderChime();
  if (isNotifyEnabled()) newOrders.forEach(showDesktopNotification);
}

/* ------------------------- Toggle buttons ------------------------- */

function wireAlertToggles() {
  const soundBtn = document.getElementById("orders-sound-toggle");
  const notifyBtn = document.getElementById("orders-notify-toggle");

  if (soundBtn) {
    updateSoundBtn(soundBtn);
    soundBtn.addEventListener("click", () => {
      unlockAudio();
      const nextOn = !isSoundEnabled();
      localStorage.setItem(SOUND_PREF_KEY, nextOn ? "on" : "off");
      updateSoundBtn(soundBtn);
      if (nextOn) playNewOrderChime(); // quick confirmation beep
    });
  }

  if (notifyBtn) {
    updateNotifyBtn(notifyBtn);
    notifyBtn.addEventListener("click", async () => {
      if (isNotifyEnabled()) {
        localStorage.setItem(NOTIFY_PREF_KEY, "off");
        updateNotifyBtn(notifyBtn);
        return;
      }
      if (!("Notification" in window)) {
        alert("This browser doesn't support desktop notifications.");
        return;
      }
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission === "granted") {
        localStorage.setItem(NOTIFY_PREF_KEY, "on");
      } else {
        alert("Notifications were blocked. Enable them for this site in your browser settings, then try again.");
      }
      updateNotifyBtn(notifyBtn);
    });
  }
}

function updateSoundBtn(btn) {
  const on = isSoundEnabled();
  btn.textContent = on ? "🔔 Sound On" : "🔕 Sound Off";
  btn.classList.toggle("alert-toggle-off", !on);
}

function updateNotifyBtn(btn) {
  const on = isNotifyEnabled();
  btn.textContent = on ? "🖥️ Alerts On" : "🖥️ Alerts Off";
  btn.classList.toggle("alert-toggle-off", !on);
}
