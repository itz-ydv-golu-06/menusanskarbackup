/* ==========================================================
   firebase-config.js
   Paste YOUR Firebase project's config below, then you're done —
   this file is already included on every page, before js/storage.js.

   Where to get these values:
   Firebase Console -> (your project) -> ⚙️ Project settings
   -> General tab -> "Your apps" -> Web app -> SDK setup and
   configuration -> "Config".

   Firestore setup reminder:
   1. In the Firebase Console, open "Firestore Database" and
      click "Create database" (any region is fine).
   2. Open "Storage" and click "Get started" if you want menu
      photos uploaded to Firebase Storage instead of stored as
      inline images.
   3. Set Firestore + Storage security rules to allow the access
      you want (e.g. public read, authenticated/admin-only write).
      The demo admin login in this project is a simple front-end
      password gate, NOT Firebase Auth — for real write protection
      you'll want to lock down your Firestore rules separately.
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
