/* ==============================================================
   firebase.js — Sanskar Grand · Firebase glue
   Single place that talks to Firebase. Everything else (menu.js,
   orders-admin.js) imports from here instead of touching the SDK
   directly, so the project can be re-pointed at a different
   Firebase project by editing only the config block below.

   HOW TO SET THIS UP — see README.md "Firebase Setup" section.
   1. Create a Firebase project → add a Web App → copy the config
      object it gives you and paste it into firebaseConfig below.
   2. Enable Firestore (production mode) in the Firebase console.
   3. Enable Authentication → Sign-in method → Email/Password, and
      create one user for yourself (this becomes the admin login
      used on the Orders panel in admin.html).
   4. Publish firestore.rules (also in this repo) via the Firebase
      console's Firestore → Rules tab, or the Firebase CLI.
   ============================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBTWRBEE0-ra4wVRxt4M_wAW8XiZ7x7Dug",
  authDomain: "sanskarmenu.firebaseapp.com",
  projectId: "sanskarmenu",
  storageBucket: "sanskarmenu.firebasestorage.app",
  messagingSenderId: "837613240142",
  appId: "1:837613240142:web:34ac81c17a8140fd3c681f",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

/* GST is applied on top of the item subtotal. Set to 0 to disable
   it entirely — the cart UI will simply hide the GST line. */
export const GST_RATE = 0.05; // 5%

/* ============================================================
   Guest side — placing an order
   ============================================================ */

/**
 * Writes a new order document to the `orders` collection.
 * `items` must already be [{ id, name, price, qty, subtotal }].
 * Returns the new document's id.
 */
export async function placeOrder({ guestName, roomNumber, mobile, note, items }) {
  if (!guestName || !guestName.trim()) throw new Error("Guest name is required.");
  if (!roomNumber || !roomNumber.trim()) throw new Error("Room number is required.");
  if (!items || !items.length) throw new Error("Your cart is empty.");

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
  const billSubtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const gstAmount = Math.round(billSubtotal * GST_RATE);
  const totalAmount = billSubtotal + gstAmount;

  const orderPayload = {
    guestName: guestName.trim(),
    roomNumber: roomNumber.trim(),
    mobile: mobile ? mobile.trim() : "",
    note: note ? note.trim() : "",
    items: items.map((i) => ({
      name: i.name,
      price: i.price,
      qty: i.qty,
      subtotal: i.subtotal,
    })),
    billSubtotal,
    gstAmount,
    totalAmount,
    totalItems,
    status: "Pending",
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "orders"), orderPayload);
  return ref.id;
}

/* ============================================================
   Admin side — live orders, status changes, deletion
   ============================================================ */

/** Subscribes to every order, newest first. Returns an unsubscribe fn.
 *  onChange receives (orders, docChanges) — docChanges lets callers tell
 *  a brand-new order apart from a status edit (type "added" vs "modified"),
 *  which is what the new-order sound/notification alerts key off of. */
export function listenToOrders(onChange, onError) {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })), snap.docChanges()),
    onError
  );
}

export function updateOrderStatus(orderId, status) {
  return updateDoc(doc(db, "orders", orderId), { status });
}

export function deleteOrder(orderId) {
  return deleteDoc(doc(db, "orders", orderId));
}

/* ============================================================
   Admin authentication (Firebase Auth — Email/Password)
   Required for the Orders panel: the Firestore security rules
   only allow order reads/updates/deletes to signed-in users, so
   this is what actually protects guest orders, not just the
   client-side password gate used elsewhere in admin.html.
   ============================================================ */

export function adminSignIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function adminSignOut() {
  return signOut(auth);
}

/** Fires immediately with the current user (or null), then on every change. */
export function watchAdminAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
