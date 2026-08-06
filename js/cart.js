/* ==============================================================
   cart.js — Sanskar Grand · Guest shopping cart
   Same philosophy as storage.js: one shared object (CartStore)
   that every page talks to, backed by localStorage so the cart
   survives refreshes and stays namespaced to this site. Classic
   (non-module) script so both classic and type="module" scripts
   loaded after it can read the global `CartStore`.
   ============================================================== */

const CartStore = (() => {
  const KEY = "sg_cart"; // array of { id, name, price, image, qty }
  const listeners = new Set();

  function getCart() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("Corrupt cart data, resetting.", err);
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(KEY, JSON.stringify(cart));
    notify(cart);
  }

  function notify(cart = getCart()) {
    listeners.forEach((fn) => fn(cart));
  }

  /** Runs `fn` immediately with the current cart, then on every change. */
  function subscribe(fn) {
    listeners.add(fn);
    fn(getCart());
    return () => listeners.delete(fn);
  }

  function addItem(item) {
    const cart = getCart();
    const existing = cart.find((i) => i.id === item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image || "",
        qty: 1,
      });
    }
    saveCart(cart);
  }

  /** delta is +1 or -1; removes the line once qty drops to 0. */
  function updateQty(id, delta) {
    const cart = getCart();
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    item.qty += delta;
    saveCart(item.qty <= 0 ? cart.filter((i) => i.id !== id) : cart);
  }

  function setQty(id, qty) {
    const cart = getCart();
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    saveCart(qty <= 0 ? cart.filter((i) => i.id !== id) : (item.qty = qty, cart));
  }

  function removeItem(id) {
    saveCart(getCart().filter((i) => i.id !== id));
  }

  function clearCart() {
    saveCart([]);
  }

  function getTotalItems() {
    return getCart().reduce((sum, i) => sum + i.qty, 0);
  }

  /** { totalItems, subtotal, gst, grandTotal } — gstRate e.g. 0.05 for 5%. */
  function getTotals(gstRate = 0.05) {
    const cart = getCart();
    const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
    const subtotal = cart.reduce((sum, i) => sum + i.qty * i.price, 0);
    const gst = gstRate > 0 ? Math.round(subtotal * gstRate) : 0;
    const grandTotal = subtotal + gst;
    return { totalItems, subtotal, gst, grandTotal };
  }

  // Keep multiple open tabs (e.g. two devices sharing one room) in sync.
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) notify();
  });

  return {
    getCart,
    addItem,
    updateQty,
    setQty,
    removeItem,
    clearCart,
    getTotalItems,
    getTotals,
    subscribe,
  };
})();

window.CartStore = CartStore;
