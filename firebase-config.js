/* ==========================================================
   firebase-config.js — already filled in for the "sanskarmenu"
   Firebase project. You don't need to touch this file again
   unless you create a different Firebase project later.

   NOTE: the code Firebase's Console shows you under "npm" uses
   `import { initializeApp } from "firebase/app"` — that's the
   ES-module style, for apps built with a bundler (Vite/webpack).
   This project is a plain static site (GitHub Pages, no build
   step), so it uses the CDN "compat" SDK instead — the <script>
   tags already added to index.html / menu.html / admin.html.
   Same Firebase project, just a different loading style. Do not
   swap in the `import ...` version here — it won't run in a
   plain <script> tag and will silently break the whole page.

   Firestore setup reminder:
   1. Firebase Console → Firestore Database must be created (it
      already is, based on your screenshot — "menu" collection).
   2. Firebase Console → Firestore Database → Rules tab controls
      who can read/write. If rules are still in "locked" mode,
      every read/write from the site will fail with a
      "Missing or insufficient permissions" error. For a menu
      site with the simple front-end password gate this project
      uses (not real Firebase Auth), a reasonable rule set is:

        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /{document=**} {
              allow read: if true;
              allow write: if true; // tighten later if you add real auth
            }
          }
        }

   3. Storage isn't required — image uploads fall back to storing
      the photo directly in Firestore if Storage isn't set up.
   ========================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyBTWRBEE0-ra4wVRxt4M_wAW8XiZ7x7Dug",
  authDomain: "sanskarmenu.firebaseapp.com",
  projectId: "sanskarmenu",
  storageBucket: "sanskarmenu.firebasestorage.app",
  messagingSenderId: "837613240142",
  appId: "1:837613240142:web:34ac81c17a8140fd3c681f"
};

// Initializes Firebase once and exposes the app instance that
// storage.js looks for. Leave this part as-is.
firebase.initializeApp(firebaseConfig);
window.firebaseApp = firebase.app();
