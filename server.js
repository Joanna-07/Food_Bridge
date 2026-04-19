import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "db.json");
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 99999)}`;
}

async function readDB() {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      users: parsed.users || [],
      foodItems: parsed.foodItems || [],
      orders: parsed.orders || [],
      proofs: parsed.proofs || [],
      reviews: parsed.reviews || [],
      favorites: parsed.favorites || [],
      rewards: parsed.rewards || [],
      promotions: parsed.promotions || [],
    };
  } catch {
    const fresh = { users: [], foodItems: [], orders: [], proofs: [], reviews: [], favorites: [], rewards: [], promotions: [] };
    await writeDB(fresh);
    return fresh;
  }
}

async function writeDB(data) {
  await fs.writeFile(DB_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "foodbridge-backend" });
});

app.post("/api/auth/register", async (req, res) => {
  const db = await readDB();
  const {
    role,
    displayName,
    phone,
    password,
    address,
    pincode,
    location,
    profilePic = "",
    dob = "",
    restaurantName = "",
    orgId = "",
    orgProofRef = "",
  } = req.body || {};

  if (!role || !displayName || !phone || !password || !address || !pincode || !location) {
    return res.status(400).json({ error: "Missing required registration fields." });
  }

  if (role === "donor" && !restaurantName) {
    return res.status(400).json({ error: "Restaurant name is required for donor." });
  }

  if (role === "organization" && (!orgId || !orgProofRef)) {
    return res.status(400).json({ error: "Organization legitimacy details are required." });
  }

  if (db.users.some((u) => u.role === role && u.phone === phone)) {
    return res.status(409).json({ error: "Account already exists for role + phone." });
  }

  const user = {
    id: uid("user"),
    role,
    displayName,
    phone,
    password,
    address,
    pincode,
    location,
    profilePic,
    dob,
    restaurantName,
    orgId,
    orgProofRef,
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);
  await writeDB(db);
  return res.status(201).json({ user: sanitizeUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const db = await readDB();
  const { role, phone, password } = req.body || {};
  const user = db.users.find(
    (u) => u.role === role && u.phone === String(phone || "").trim() && u.password === password
  );
  if (!user) return res.status(401).json({ error: "Invalid credentials." });
  return res.json({ user: sanitizeUser(user) });
});

app.get("/api/users/:id", async (req, res) => {
  const db = await readDB();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  return res.json({ user: sanitizeUser(user) });
});

app.put("/api/users/:id", async (req, res) => {
  const db = await readDB();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });

  const fields = ["displayName", "phone", "address", "pincode", "location", "profilePic", "dob"];
  for (const field of fields) {
    if (req.body[field] !== undefined) user[field] = String(req.body[field]);
  }

  await writeDB(db);
  return res.json({ user: sanitizeUser(user) });
});

app.get("/api/foods", async (req, res) => {
  const db = await readDB();
  const { donorId, location, pincode, q } = req.query;
  let items = [...db.foodItems];

  if (donorId) items = items.filter((i) => i.donorId === donorId);
  if (location) items = items.filter((i) => String(i.donorLocation).toLowerCase().includes(String(location).toLowerCase()));
  if (q) {
    const s = String(q).toLowerCase();
    items = items.filter((i) => i.name.toLowerCase().includes(s) || i.donorName.toLowerCase().includes(s));
  }
  if (pincode) {
    const pin = Number(pincode);
    if (Number.isFinite(pin)) {
      items = items.filter((i) => Math.abs(Number(i.donorPincode) - pin) <= 20);
    }
  }

  res.json({ foodItems: items });
});

app.post("/api/foods", async (req, res) => {
  const db = await readDB();
  const { donorId, donorName, donorLocation, donorPincode, name, qty, price, collectBefore } = req.body || {};
  if (!donorId || !donorName || !name || qty === undefined || price === undefined || !collectBefore) {
    return res.status(400).json({ error: "Missing food fields." });
  }

  const item = {
    id: uid("food"),
    donorId,
    donorName,
    donorLocation,
    donorPincode,
    name,
    qty: Number(qty),
    price: Number(price),
    collectBefore,
    available: Number(qty) > 0,
    createdAt: new Date().toISOString(),
  };
  db.foodItems.push(item);
  await writeDB(db);
  res.status(201).json({ foodItem: item });
});

app.put("/api/foods/:id", async (req, res) => {
  const db = await readDB();
  const item = db.foodItems.find((f) => f.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Food item not found." });

  if (req.body.name !== undefined) item.name = String(req.body.name);
  if (req.body.price !== undefined) item.price = Number(req.body.price);
  if (req.body.qty !== undefined) item.qty = Number(req.body.qty);
  if (req.body.collectBefore !== undefined) item.collectBefore = String(req.body.collectBefore);
  if (req.body.available !== undefined) item.available = Boolean(req.body.available);
  if (item.qty <= 0) item.available = false;

  await writeDB(db);
  res.json({ foodItem: item });
});

app.get("/api/orders", async (req, res) => {
  const db = await readDB();
  const { donorId, buyerId } = req.query;
  let orders = [...db.orders];
  if (donorId) orders = orders.filter((o) => o.donorId === donorId);
  if (buyerId) orders = orders.filter((o) => o.buyerId === buyerId);
  res.json({ orders });
});

app.post("/api/orders", async (req, res) => {
  const db = await readDB();
  const {
    itemId,
    buyerId,
    buyerName,
    buyerRole,
    qty,
    collectTime,
    paymentMethod = "Cash",
  } = req.body || {};

  const item = db.foodItems.find((f) => f.id === itemId);
  if (!item || !item.available) return res.status(404).json({ error: "Food item unavailable." });

  const requestedQty = Number(qty);
  if (!Number.isFinite(requestedQty) || requestedQty < 1 || requestedQty > item.qty) {
    return res.status(400).json({ error: "Invalid quantity." });
  }

  const pickupCode = String(Math.floor(10000 + Math.random() * 90000));
  const order = {
    id: uid("order"),
    itemId: item.id,
    itemName: item.name,
    donorId: item.donorId,
    donorName: item.donorName,
    buyerId,
    buyerName,
    buyerRole,
    qty: requestedQty,
    collectTime,
    paymentMethod,
    pickupCode,
    codeVerified: false,
    orderedAt: new Date().toISOString(),
    status: "Placed",
  };

  db.orders.push(order);
  item.qty -= requestedQty;
  if (item.qty <= 0) item.available = false;

  await writeDB(db);
  res.status(201).json({ order });
});

app.post("/api/orders/:id/verify", async (req, res) => {
  const db = await readDB();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found." });

  if (String(req.body.code || "") !== String(order.pickupCode)) {
    return res.status(400).json({ error: "Invalid pickup code." });
  }

  order.codeVerified = true;
  order.status = "Delivered";
  await writeDB(db);
  res.json({ order });
});

app.post("/api/orders/:id/review", async (req, res) => {
  const db = await readDB();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found." });
  if (order.status !== "Delivered") return res.status(400).json({ error: "Review allowed only after delivery." });

  const { userId, rating, comment = "" } = req.body || {};
  if (!userId || !rating) return res.status(400).json({ error: "userId and rating are required." });

  const existing = db.reviews.find((r) => r.orderId === order.id && r.userId === userId);
  if (existing) {
    existing.rating = Number(rating);
    existing.comment = comment;
    existing.updatedAt = new Date().toISOString();
  } else {
    db.reviews.push({
      id: uid("review"),
      orderId: order.id,
      userId,
      donorId: order.donorId,
      rating: Number(rating),
      comment,
      createdAt: new Date().toISOString(),
    });
  }

  await writeDB(db);
  res.status(201).json({ ok: true });
});

app.get("/api/reviews", async (req, res) => {
  const db = await readDB();
  const { donorId, userId } = req.query;
  let reviews = [...db.reviews];
  if (donorId) reviews = reviews.filter((r) => r.donorId === donorId);
  if (userId) reviews = reviews.filter((r) => r.userId === userId);
  res.json({ reviews });
});

app.post("/api/proofs", async (req, res) => {
  const db = await readDB();
  const { orderId, orgId, files = [] } = req.body || {};
  if (!orderId || !orgId || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "orderId, orgId and files are required." });
  }

  const existing = db.proofs.find((p) => p.orderId === orderId);
  if (existing) {
    existing.files = files;
    existing.uploadedAt = new Date().toISOString();
  } else {
    db.proofs.push({
      id: uid("proof"),
      orderId,
      orgId,
      files,
      uploadedAt: new Date().toISOString(),
    });
  }

  await writeDB(db);
  res.status(201).json({ ok: true });
});

app.get("/api/proofs", async (req, res) => {
  const db = await readDB();
  const { orgId } = req.query;
  const proofs = orgId ? db.proofs.filter((p) => p.orgId === orgId) : db.proofs;
  res.json({ proofs });
});

app.get("/api/favorites", async (req, res) => {
  const db = await readDB();
  const { userId } = req.query;
  const favorites = userId ? db.favorites.filter((f) => f.userId === userId) : db.favorites;
  res.json({ favorites });
});

app.post("/api/favorites/toggle", async (req, res) => {
  const db = await readDB();
  const { userId, donorId } = req.body || {};
  if (!userId || !donorId) return res.status(400).json({ error: "userId and donorId are required." });

  const index = db.favorites.findIndex((f) => f.userId === userId && f.donorId === donorId);
  let favorited = true;
  if (index >= 0) {
    db.favorites.splice(index, 1);
    favorited = false;
  } else {
    db.favorites.push({ id: uid("fav"), userId, donorId, createdAt: new Date().toISOString() });
  }
  await writeDB(db);
  res.json({ favorited });
});

app.get("/api/promotions", async (_req, res) => {
  const db = await readDB();
  if (!db.promotions.length) {
    db.promotions = [
      { id: uid("promo"), text: "🔥 20% off for evening rescue pickups" },
      { id: uid("promo"), text: "🎉 Surprise meal drop unlocked at 7 PM" },
      { id: uid("promo"), text: "⭐ Collect 5 orders and earn eco rewards" },
    ];
    await writeDB(db);
  }
  res.json({ promotions: db.promotions });
});

app.post("/api/rewards/spin", async (req, res) => {
  const db = await readDB();
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId is required." });

  const date = new Date().toISOString().slice(0, 10);
  const existing = db.rewards.find((r) => r.userId === userId && r.date === date);
  if (existing) return res.json({ reward: existing.reward, alreadyClaimed: true });

  const pool = ["₹20 voucher", "10% off pickup", "Free priority slot", "Bonus eco points"];
  const reward = pool[Math.floor(Math.random() * pool.length)];
  db.rewards.push({ id: uid("reward"), userId, reward, date, createdAt: new Date().toISOString() });
  await writeDB(db);
  res.status(201).json({ reward, alreadyClaimed: false });
});

app.listen(PORT, () => {
  console.log(`FoodBridge backend running on http://localhost:${PORT}`);
});
