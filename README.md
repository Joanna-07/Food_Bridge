diff --git a/README.md b/README.md
index 23cf898f4dc28924b5e4a3cbfd2b7b31af06e872..f37be30da2fa51120738d24081d47ddf519bc35c 100644
--- a/README.md
+++ b/README.md
@@ -1,40 +1,50 @@
-diff --git a/README.md b/README.md
-index 6747a73df7389b7ff807ca1f66730f8f9a0510ba..e36972a9ddc5ce71776b075b5ad8b7e36125d8e4 100644
---- a/README.md
-+++ b/README.md
-@@ -1,2 +1,35 @@
- # food_donation
- 
-+## Frontend
-+Static files are at repository root:
-+- `index.html`
-+- `styles.css`
-+- `app.js`
-+
-+Open `index.html` directly in browser for the current client-only prototype.
-+
-+## Backend (new)
-+A Node/Express backend is available in `backend/`.
-+
-+### Setup
-+```bash
-+cd backend
-+npm install
-+npm run start
-+```
-+
-+Server runs at `http://localhost:4000` by default.
-+
-+### API highlights
-+- `POST /api/auth/register`
-+- `POST /api/auth/login`
-+- `GET /api/users/:id`, `PUT /api/users/:id`
-+- `GET /api/foods`, `POST /api/foods`, `PUT /api/foods/:id`
-+- `GET /api/orders`, `POST /api/orders`, `POST /api/orders/:id/verify`
-+- `POST /api/orders/:id/review`, `GET /api/reviews`
-+- `POST /api/proofs`, `GET /api/proofs`
-+- `GET /api/favorites`, `POST /api/favorites/toggle`
-+- `GET /api/promotions`
-+- `POST /api/rewards/spin`
-+
-+Data is persisted to `backend/db.json`.
+# Food Bridge
+
+This project is a GitHub Pages-friendly frontend for food donation workflows.
+
+## Make login work across devices (Firebase)
+
+To use one account on multiple devices, use **Firebase Authentication** instead of browser-only localStorage.
+
+### 1) Create a Firebase project
+1. Open Firebase Console.
+2. Create/select a project.
+3. Add a **Web App** and copy the Firebase config object.
+
+### 2) Enable Authentication methods
+In **Firebase Console → Authentication → Sign-in method**:
+- Enable **Email/Password**
+- Enable **Google**
+
+### 3) Create Firestore database
+In **Firebase Console → Firestore Database**:
+- Create database (start in test mode while developing)
+- Collection used by this app: `users`
+
+### 4) Update `index.html` config
+Replace placeholder values in:
+
+```html
+window.FIREBASE_CONFIG = {
+  apiKey: "YOUR_API_KEY",
+  authDomain: "YOUR_PROJECT.firebaseapp.com",
+  projectId: "YOUR_PROJECT_ID",
+  appId: "YOUR_APP_ID"
+};
+```
+
+### 5) Deploy to GitHub Pages
+1. Push changes to your repo.
+2. In GitHub: **Settings → Pages**
+3. Deploy from your main branch `/ (root)`.
+
+Site URL:
+`https://joanna-07.github.io/Food_Bridge/`
+
+## How auth now works
+- **Register (Email/Password):** creates Firebase Auth account and stores profile/role in Firestore.
+- **Login (Email/Password):** verifies with Firebase Auth and loads profile from Firestore.
+- **Continue with Google:** signs in with Google and creates a Firestore profile on first login.
+- **Logout:** signs out from Firebase.
+
+If Firebase config remains placeholder values, the app falls back to local single-device mode.
