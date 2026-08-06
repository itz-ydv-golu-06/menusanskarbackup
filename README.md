# Sanskar Grand — Restaurant Website

A premium, fully static restaurant website for **Sanskar Grand by Maan** (Jaipur),
built with plain HTML5, CSS3 and vanilla JavaScript. No frameworks, no backend,
no build step — deploy it straight to GitHub Pages.

## Folder structure

```
Sanskar-Grand/
├── index.html          Homepage (hero, about, specials, gallery, reviews, contact)
├── menu.html            Full interactive menu (search, filters, favorites, dark mode)
├── admin.html            Password-protected admin panel
├── css/
│   ├── style.css        Shared design tokens + homepage styles
│   ├── menu.css          Menu page styles
│   └── admin.css          Admin panel styles
├── js/
│   ├── storage.js        Shared "offline database" (localStorage + menu.json)
│   ├── app.js             Homepage behaviour
│   ├── menu.js             Menu page behaviour
│   └── admin.js             Admin panel behaviour
├── data/
│   └── menu.json           Source-of-truth menu data (extracted from the printed menu)
├── images/                  Drop real food/hotel photography here
├── icons/                    favicon.svg
└── assets/                    Reserved for any extra static assets
```

## Running locally

Because the site uses `fetch()` to load `data/menu.json`, open it through a local
server rather than double-clicking the HTML file (`file://` URLs block `fetch`).

```bash
cd Sanskar-Grand
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Deploying to GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo, go to **Settings → Pages**.
3. Set **Source** to the `main` branch, root folder.
4. Save — your site will be live at `https://<username>.github.io/<repo>/`.

No build tools, no `node_modules`, no server config required.

## How the data layer works

- `data/menu.json` is the **seed data** — the seven-page printed menu converted to JSON.
- On first visit, the browser copies that JSON into `localStorage` and treats
  `localStorage` as the live database from then on.
- The **Admin Panel** (`admin.html`) reads and writes only through `localStorage`,
  via the shared `SanskarDB` object in `js/storage.js`.
- Because `localStorage` is per-browser, admin edits only appear on the device
  that made them until you **export** the updated JSON and commit it back to
  `data/menu.json` — at that point every visitor gets the update.

## Admin Panel

- URL: `admin.html`
- Demo password: `sanskar@grand` (change `ADMIN_PASSWORD` in `js/storage.js` before
  going live — this is a client-side gate suitable for a static/demo site, not
  real authentication, since there is no server to enforce it).
- Features: dashboard stats, add/edit/delete items, edit categories, edit prices,
  upload a food photo (stored as a base64 image directly in the JSON), toggle
  availability, mark Best Seller / Chef Special, preview the live menu, export
  `menu.json`, import a JSON file, and reset back to the shipped defaults.

## Notes on images

No food photography was bundled with this project. Every dish instead renders
an elegant CSS-only "plate" placeholder keyed to its category icon. To use real
photos:

1. Add files to `/images`.
2. Either set an item's `image` field to that path via the Admin Panel's photo
   uploader, or edit `data/menu.json` directly and add `"image": "images/your-photo.jpg"`
   to any item.

## Guest Ordering System (Firebase Firestore)

Guests can now build a cart on `menu.html` and place a real order that lands
live in the Admin Panel — no backend server, just Firestore.

**Guest flow:** browse `menu.html` → tap **+ Add to Cart** on a dish → open the
cart (navbar icon or the sticky "View Cart" bar) → adjust quantities → **Proceed
to Checkout** → enter Guest Name + Room Number (Mobile & Notes optional) →
**Order Now** → success screen → redirected to `thank-you.html`. The cart lives
in `localStorage` (`js/cart.js`, `CartStore`) so it survives refreshes.

**Admin flow:** `admin.html` → **Orders** in the sidebar → sign in (see setup
below) → every order streams in live via `onSnapshot()`, newest first. Search
by room or guest name, filter by status, change status from the dropdown
(updates Firestore immediately, no page reload), and delete `Delivered` /
`Cancelled` orders.

### Firebase Setup

1. Go to the [Firebase console](https://console.firebase.google.com), create a
   project, then **Build → Firestore Database → Create database** (production
   mode is fine — the rules below lock it down).
2. **Build → Authentication → Sign-in method → Email/Password → Enable.**
   Then **Authentication → Users → Add user** and create yourself an admin
   login (this is what you'll use on the Orders panel — separate from the
   existing `admin.html` page password used for Menu Items/Categories).
3. **Project settings → General → Your apps → Add app → Web app.** Copy the
   `firebaseConfig` object it gives you into `js/firebase.js`, replacing the
   placeholder values at the top of the file.
4. Publish the security rules in `firestore.rules` (Firestore Database →
   Rules tab → paste → Publish). These rules let guests only *create* orders
   (never read, edit, or delete them) and let only signed-in admins read,
   update, or delete orders — see the comments in that file for details.
5. Open `menu.html` through a local server (see "Running locally" above,
   `fetch()`/ES modules both need `http://`, not `file://`) and place a test
   order, then check it shows up instantly on the Orders panel.

### Notes

- **Collections used:** `orders` (every guest order — see the schema in
  `js/firebase.js`'s `placeOrder()`) and `menu` (reserved — the live menu
  itself still reads from `data/menu.json` / the Admin Panel's `localStorage`
  layer exactly as before; nothing about menu editing changed).
- **GST:** applied at 5% in `js/firebase.js` (`GST_RATE`). Set it to `0` to
  remove the GST line from the cart summary and order totals entirely.
- **Order status values:** `Pending → Preparing → Ready → Delivered →
  Cancelled`, color-coded in the Admin Panel (orange/blue/purple/green/red).
- The existing `admin.html` password gate (`js/storage.js`, demo password
  `sanskar@grand`) is unchanged and still guards the whole admin page. The
  Firebase Authentication sign-in is a second, independent gate specific to
  the Orders panel, since that's the one actually enforced server-side by
  `firestore.rules`.

## Customizing

- **Colors, type, spacing:** all defined as CSS custom properties at the top of
  `css/style.css` — change them once and the whole site updates.
- **Menu content:** edit `data/menu.json` directly, or use the Admin Panel and
  export when done.
- **Contact details, WhatsApp number, map:** search `index.html` and `menu.html`
  for `+919000000000` and the Google Maps `<iframe>` and replace with your real details.
