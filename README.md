diff --git a/README.md b/README.md
index 6747a73df7389b7ff807ca1f66730f8f9a0510ba..e36972a9ddc5ce71776b075b5ad8b7e36125d8e4 100644
--- a/README.md
+++ b/README.md
@@ -1,2 +1,35 @@
 # food_donation
 
+## Frontend
+Static files are at repository root:
+- `index.html`
+- `styles.css`
+- `app.js`
+
+Open `index.html` directly in browser for the current client-only prototype.
+
+## Backend (new)
+A Node/Express backend is available in `backend/`.
+
+### Setup
+```bash
+cd backend
+npm install
+npm run start
+```
+
+Server runs at `http://localhost:4000` by default.
+
+### API highlights
+- `POST /api/auth/register`
+- `POST /api/auth/login`
+- `GET /api/users/:id`, `PUT /api/users/:id`
+- `GET /api/foods`, `POST /api/foods`, `PUT /api/foods/:id`
+- `GET /api/orders`, `POST /api/orders`, `POST /api/orders/:id/verify`
+- `POST /api/orders/:id/review`, `GET /api/reviews`
+- `POST /api/proofs`, `GET /api/proofs`
+- `GET /api/favorites`, `POST /api/favorites/toggle`
+- `GET /api/promotions`
+- `POST /api/rewards/spin`
+
+Data is persisted to `backend/db.json`.
