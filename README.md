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

## Customizing

- **Colors, type, spacing:** all defined as CSS custom properties at the top of
  `css/style.css` — change them once and the whole site updates.
- **Menu content:** edit `data/menu.json` directly, or use the Admin Panel and
  export when done.
- **Contact details, WhatsApp number, map:** search `index.html` and `menu.html`
  for `+919000000000` and the Google Maps `<iframe>` and replace with your real details.
