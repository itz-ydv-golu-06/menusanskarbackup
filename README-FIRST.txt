==============================================================
 SANSKAR GRAND by MAAN — SITE UPGRADE v2 ("Grand Reserve")
 Drop-in package · prepared 9 Sep 2026
==============================================================

WHAT'S INSIDE (only these files change — nothing else is touched)
--------------------------------------------------------------
  index.html          -> REPLACES your old index.html   (new luxury homepage)
  menu.html           -> REPLACES your old menu.html    (new menu page)
  css/home.css        -> NEW file (homepage stylesheet)
  css/menu.css        -> REPLACES your old css/menu.css (new menu stylesheet)
  images/*.jpg        -> NEW photos (hero, hotel, gallery, rooms)

NOT touched (everything keeps working exactly as before):
  js/ (app.js, menu.js, cart.js, storage.js, firebase.js, admin.js...)
  data/menu.json, admin.html, thank-you.html, css/style.css,
  css/admin.css, icons/, manifest.json, PWA + APK GitHub workflow.
  Your admin panel edits, cart (sg_cart), favourites and Firebase
  orders all keep working — the new pages use the same IDs & storage keys.

HOW TO UPLOAD (5 minutes, no computer needed)
--------------------------------------------------------------
1. Go to https://github.com/itz-ydv-golu-06/menusanskarbackup
2. REPLACE FILES:
   - Open index.html  -> click pencil icon (Edit) -> delete all -> paste new
     index.html content -> Commit.   (Easier: use "Add file > Upload files"
     after deleting the old file, or push with git.)
   - Same for menu.html.
   - Same for css/menu.css.
3. ADD NEW FILES:
   - "Add file > Upload files": drop css/home.css  (inside css/ folder).
   - Inside images/ folder: "Upload files" and drop the 10 new .jpg photos.
   Easiest way: upload the WHOLE package folder at once using
   https://github.com/upload or the GitHub Desktop app / git:
       git clone https://github.com/itz-ydv-golu-06/menusanskarbackup
       (copy package files over the repo, then)
       git add -A && git commit -m "Site upgrade v2" && git push
4. Wait ~1 minute. Open https://itz-ydv-golu-06.github.io/menusanskarbackup/
   (hard-refresh with Ctrl+Shift+R / clear cache if it looks old).

WHAT GOT BETTER
--------------------------------------------------------------
HOMEPAGE
  * Real photography instead of emoji placeholders (hero, story, gallery, rooms)
  * Cinematic full-screen hero with slow zoom + live "Open now / Closed" chip
  * Animated stat counters (90+ dishes / 100% veg / 16 hrs service)
  * Gold marquee strip, rotating "seal" badge, scroll-spy navbar
  * Category tiles now ACTUALLY render (old page was missing #category-grid,
    so app.js silently skipped the whole section)
  * Gallery with click-to-zoom lightbox
  * Auto-rotating guest reviews slider
  * "Reserve a table" form that opens WhatsApp with the request pre-filled
  * Embedded Google Map of the hotel
  * Fixed SEO: real canonical URL, Open Graph image, Restaurant+Hotel schema
    (old page pointed canonical at "sanskargrand.example.com")
MENU PAGE
  * Full visual rebuild: dark luxury theme + working light/dark toggle
  * Sticky search/filter toolbar, category chips, grid/list switch
  * Nicer dish cards with badges, veg mark, favourites, add-to-cart bump
  * Closed-hours banner now actually shows (old page had no #hours-banner)
  * Polished cart drawer, checkout form, sticky "View Cart" bar, toasts
  * Removed the stray "call 222" text
BOTH PAGES
  * Faster perceived load (preloads, lazy images, lighter loader)
  * Mobile-first responsive layouts, reduced-motion support
  * Same JS hooks => admin edits / cart / orders / PWA unchanged

NOTES
--------------------------------------------------------------
- The 10 photos are premium placeholder shots. When you have real photos of
  YOUR hotel, just replace the files in images/ keeping the SAME names
  (hero-dining.jpg, hotel-night.jpg, gallery-*.jpg, room-*.jpg) and the site
  updates automatically.
- Phone/WhatsApp (+91 97993 41599), email and address are wired everywhere.
- Never share your GitHub token with anyone or paste it in websites/chats.
  If you already pasted it somewhere: GitHub > Settings > Developer settings >
  Tokens > Revoke, then create a new one.

Enjoy the new house. 🥂
==============================================================
