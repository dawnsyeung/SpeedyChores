/* ============================================================================
   SpeedyChores — Firebase configuration
   ----------------------------------------------------------------------------
   ★ THIS IS THE ONLY FILE DAWN NEEDS TO TOUCH FOR FIREBASE SETUP ★

   HOW TO FILL THIS IN (takes ~5 minutes, no coding):
   1. Go to https://console.firebase.google.com and sign in with Google.
   2. Click "Add project" → name it "SpeedyChores" → continue (Google
      Analytics is optional — you can turn it off).
   3. In the left menu click "Build" → "Realtime Database" → "Create Database".
      Choose "Start in test mode" (we'll set family-friendly rules later —
      see DESIGN.md for the rules snippet).
   4. Click the gear ⚙️ (top-left) → "Project settings" → under "Your apps"
      click the web icon </> → nickname it "speedychores-web" → "Register app".
   5. Firebase will show you a `firebaseConfig` object. Copy each value into
      the matching field below, replacing the PLACEHOLDER text.
   6. Save this file, re-upload the site files — done. Every device will now
      sync in real time.

   DEMO MODE: until real values are pasted below, the app automatically runs
   in demo mode — everything works, but data is stored in the browser's
   localStorage instead of Firebase (per device, no sync). A banner at the
   top of the app will say "DEMO MODE" until Firebase is configured.
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyAzXBe3eOwAuOincqs-n_eLdUm7Xk8fVUY",
  authDomain: "speedychores-ce84e.firebaseapp.com",
  databaseURL: "https://speedychores-ce84e-default-rtdb.firebaseio.com",
  projectId: "speedychores-ce84e",
  storageBucket: "speedychores-ce84e.firebasestorage.app",
  messagingSenderId: "971547266998",
  appId: "1:971547266998:web:6ccbfc974ded430cbefb17"
};

/* ----------------------------------------------------------------------------
   Everything in the database lives under this one root path, so all data
   stays neatly namespaced:  speedychores/config, speedychores/days, etc.
   Do not change this unless you also update DESIGN.md.
   -------------------------------------------------------------------------- */
const DB_ROOT = "speedychores";

/* True when real Firebase values have been pasted in (demo mode otherwise). */
const FIREBASE_READY = firebaseConfig.apiKey !== "PASTE_YOUR_API_KEY_HERE";
