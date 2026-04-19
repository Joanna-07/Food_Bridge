const STORAGE_KEY = "foodbridge_data_v2";

const state = {
  db: loadDB(),
  currentUser: null,
};

const refs = {
  loginTab: document.getElementById("loginTab"),
  registerTab: document.getElementById("registerTab"),
  loginForm: document.getElementById("loginForm"),
  registerForm: document.getElementById("registerForm"),
  registerRole: document.getElementById("registerRole"),
  donorFields: document.getElementById("donorFields"),
  organizationFields: document.getElementById("organizationFields"),
  authCard: document.getElementById("authCard"),
  dashboard: document.getElementById("dashboard"),
  logoutBtn: document.getElementById("logoutBtn"),
  mainContent: document.getElementById("mainContent"),
  welcomeText: document.getElementById("welcomeText"),
  roleText: document.getElementById("roleText"),
  topActions: document.getElementById("topActions"),
  browseRegLocation: document.getElementById("browseRegLocation"),
};

function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const fallback = { users: [], foodItems: [], orders: [], proofs: [], reviews: [], favorites: [], rewards: [] };
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return {
      users: parsed.users || [],
      foodItems: parsed.foodItems || [],
      orders: parsed.orders || [],
      proofs: parsed.proofs || [],
      reviews: parsed.reviews || [],
      favorites: parsed.favorites || [],
      rewards: parsed.rewards || [],
    };
  } catch {
    return fallback;
  }
}

function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db));
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
}

function showToast(message) {
  document.getElementById("toastMsg").textContent = message;
  new bootstrap.Toast(document.getElementById("appToast")).show();
}

function setAuthMode(mode) {
  const isLogin = mode === "login";
  refs.loginTab.classList.toggle("active", isLogin);
  refs.registerTab.classList.toggle("active", !isLogin);
  refs.loginForm.classList.toggle("d-none", !isLogin);
  refs.registerForm.classList.toggle("d-none", isLogin);
}

refs.loginTab.addEventListener("click", () => setAuthMode("login"));
refs.registerTab.addEventListener("click", () => setAuthMode("register"));

refs.registerRole.addEventListener("change", (e) => {
  const role = e.target.value;
  refs.donorFields.classList.toggle("d-none", role !== "donor");
  refs.organizationFields.classList.toggle("d-none", role !== "organization");
});

refs.browseRegLocation.addEventListener("click", async () => {
  const loc = await getLocationText();
  if (loc) {
    document.getElementById("regLocation").value = loc;
    showToast("Location selected.");
  }
});

refs.registerForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const role = document.getElementById("registerRole").value;
  const phone = document.getElementById("regPhone").value.trim();
  if (!role || !phone) return;

  if (state.db.users.some((u) => u.phone === phone && u.role === role)) {
    showToast("Account already exists for this role and phone number.");
    return;
  }

  const user = {
    id: uid("user"),
    role,
    displayName: document.getElementById("regName").value.trim(),
    phone,
    password: document.getElementById("regPassword").value,
    address: document.getElementById("regAddress").value.trim(),
    pincode: document.getElementById("regPincode").value.trim(),
    location: document.getElementById("regLocation").value.trim(),
    profilePic: document.getElementById("regProfilePic").value.trim(),
    dob: document.getElementById("regDob").value || "",
    restaurantName: document.getElementById("donorRestaurant").value.trim(),
    orgId: document.getElementById("orgId").value.trim(),
    orgProofRef: document.getElementById("orgProof").value.trim(),
    createdAt: new Date().toISOString(),
  };

  if (role === "donor" && !user.restaurantName) {
    showToast("Please provide restaurant name for donor registration.");
    return;
  }

  if (role === "organization" && (!user.orgId || !user.orgProofRef)) {
    showToast("Organization legitimacy details are required.");
    return;
  }

  state.db.users.push(user);
  saveDB();
  refs.registerForm.reset();
  refs.donorFields.classList.add("d-none");
  refs.organizationFields.classList.add("d-none");
  setAuthMode("login");
  showToast("Account created. Please login.");
});

refs.loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const role = document.getElementById("loginRole").value;
  const phone = document.getElementById("loginPhone").value.trim();
  const password = document.getElementById("loginPassword").value;

  const user = state.db.users.find(
    (u) => u.role === role && u.phone === phone && u.password === password
  );

  if (!user) {
    showToast("Invalid login credentials.");
    return;
  }

  state.currentUser = user;
  renderDashboard();
});

refs.logoutBtn.addEventListener("click", () => {
  state.currentUser = null;
  refs.dashboard.classList.add("d-none");
  refs.authCard.classList.remove("d-none");
  refs.logoutBtn.classList.add("d-none");
  refs.loginForm.reset();
  showToast("Logged out successfully.");
});

function renderDashboard() {
  const user = state.currentUser;
  if (!user) return;

  refs.authCard.classList.add("d-none");
  refs.dashboard.classList.remove("d-none");
  refs.logoutBtn.classList.remove("d-none");

  refs.welcomeText.textContent = `Hi, ${user.displayName}`;
  refs.roleText.textContent = `${user.role.toUpperCase()} Dashboard`;

  const actions = [
    { id: "home", label: "Home" },
    { id: "profile", label: "Profile" },
    { id: user.role === "donor" ? "orders" : "history", label: user.role === "donor" ? "Orders" : "Order History" },
  ];

  if (user.role === "organization") {
    actions.push({ id: "proof", label: "Upload Proof" });
  }

  refs.topActions.innerHTML = actions
    .map((a) => `<button class="btn btn-outline-primary btn-sm" data-action="${a.id}">${a.label}</button>`)
    .join("");

  refs.topActions.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "home") {
        if (user.role === "donor") renderDonorHome();
        if (user.role === "user") renderUserOrOrganizationHome(false);
        if (user.role === "organization") renderUserOrOrganizationHome(true);
      }
      if (action === "profile") renderProfile();
      if (action === "orders") renderDonorOrders();
      if (action === "history") renderOrderHistory();
      if (action === "proof") renderProofUpload();
    });
  });

  if (user.role === "donor") renderDonorHome();
  if (user.role === "user") renderUserOrOrganizationHome(false);
  if (user.role === "organization") renderUserOrOrganizationHome(true);
}

function avatarFor(user) {
  return user.profilePic || "https://cdn.jsdelivr.net/gh/edent/SuperTinyIcons/images/svg/user.svg";
}

function renderProfile() {
  const u = state.currentUser;
  refs.mainContent.innerHTML = `
    <div class="profile-card mb-3">
      <div class="d-flex gap-3 align-items-center flex-wrap">
        <img src="${avatarFor(u)}" class="avatar" alt="profile" onerror="this.src='https://cdn.jsdelivr.net/gh/edent/SuperTinyIcons/images/svg/user.svg'" />
        <div>
          <h4 class="mb-1">${u.displayName}</h4>
          <p class="mb-1">${u.role.toUpperCase()}</p>
          <small>${u.location} • ${u.pincode}</small>
        </div>
      </div>
    </div>

    <div class="card glass-card">
      <div class="card-body">
        <h4 class="section-title mb-3">Profile Details</h4>
        <form id="profileForm" class="row g-3">
          <div class="col-md-6"><label class="form-label">Name</label><input class="form-control" id="pName" value="${u.displayName}" /></div>
          <div class="col-md-6"><label class="form-label">Phone</label><input class="form-control" id="pPhone" value="${u.phone}" /></div>
          <div class="col-md-6"><label class="form-label">Address</label><input class="form-control" id="pAddress" value="${u.address}" /></div>
          <div class="col-md-3"><label class="form-label">Pincode</label><input class="form-control" id="pPincode" value="${u.pincode}" /></div>
          <div class="col-md-3"><label class="form-label">Location</label><input class="form-control" id="pLocation" list="locationList" value="${u.location}" /></div>
          <div class="col-md-4"><label class="form-label">Date of Birth (optional)</label><input type="date" class="form-control" id="pDob" value="${u.dob || ""}" /></div>
          <div class="col-md-8"><label class="form-label">Profile Picture URL (optional)</label><input type="url" class="form-control" id="pPic" value="${u.profilePic || ""}" /></div>
          <div class="col-12 d-grid"><button class="btn btn-success">Save Profile</button></div>
        </form>
      </div>
    </div>
  `;

  document.getElementById("profileForm").addEventListener("submit", (e) => {
    e.preventDefault();
    u.displayName = document.getElementById("pName").value.trim();
    u.phone = document.getElementById("pPhone").value.trim();
    u.address = document.getElementById("pAddress").value.trim();
    u.pincode = document.getElementById("pPincode").value.trim();
    u.location = document.getElementById("pLocation").value.trim();
    u.dob = document.getElementById("pDob").value;
    u.profilePic = document.getElementById("pPic").value.trim();
    saveDB();
    refs.welcomeText.textContent = `Hi, ${u.displayName}`;
    showToast("Profile updated.");
  });
}

function renderDonorHome() {
  const donor = state.currentUser;
  const donorItems = state.db.foodItems.filter((f) => f.donorId === donor.id);

  refs.mainContent.innerHTML = `
    <div class="card glass-card mb-3">
      <div class="card-body">
        <h4 class="section-title mb-3">Manage Food Items</h4>
        <form id="addFoodForm" class="row g-3">
          <div class="col-md-3"><input class="form-control" id="foodName" placeholder="Food name" required></div>
          <div class="col-md-2"><input type="number" min="1" class="form-control" id="foodQty" placeholder="Qty" required></div>
          <div class="col-md-2"><input type="number" min="0" class="form-control" id="foodPrice" placeholder="Price" required></div>
          <div class="col-md-3"><input type="datetime-local" class="form-control" id="foodCutoff" required></div>
          <div class="col-md-2 d-grid"><button class="btn btn-success" type="submit">Add Food</button></div>
        </form>
      </div>
    </div>

    <div class="card glass-card">
      <div class="card-body">
        <h4 class="section-title mb-3">Your Menu</h4>
        ${donorItems.length === 0 ? '<div class="empty-state">No food items yet. Add food to make it visible for users.</div>' : `
        <div class="table-responsive">
          <table class="table align-middle">
            <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Collect Before</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${donorItems.map((f) => `<tr>
                  <td>${f.name}</td>
                  <td>${f.qty}</td>
                  <td>₹${f.price}</td>
                  <td>${formatDT(f.collectBefore)}</td>
                  <td>${f.available ? "Available" : "Out of stock"}</td>
                  <td>
                    <button class="btn btn-sm btn-warning" data-edit="${f.id}">Edit</button>
                    <button class="btn btn-sm btn-secondary" data-sold="${f.id}">Mark Sold Out</button>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>`}
      </div>
    </div>
  `;

  document.getElementById("addFoodForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.db.foodItems.push({
      id: uid("food"),
      donorId: donor.id,
      donorName: donor.restaurantName || donor.displayName,
      donorLocation: donor.location,
      donorPincode: donor.pincode,
      name: document.getElementById("foodName").value.trim(),
      qty: Number(document.getElementById("foodQty").value),
      price: Number(document.getElementById("foodPrice").value),
      collectBefore: document.getElementById("foodCutoff").value,
      available: true,
      createdAt: new Date().toISOString(),
    });
    saveDB();
    renderDonorHome();
    showToast("Food item added.");
  });

  refs.mainContent.querySelectorAll("[data-sold]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = state.db.foodItems.find((f) => f.id === btn.dataset.sold);
      if (!item) return;
      item.available = false;
      saveDB();
      renderDonorHome();
      showToast("Item marked as sold out.");
    });
  });

  refs.mainContent.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = state.db.foodItems.find((f) => f.id === btn.dataset.edit);
      if (!item) return;
      const newQty = Number(prompt("Update quantity:", item.qty));
      const newPrice = Number(prompt("Update price:", item.price));
      if (!Number.isNaN(newQty) && newQty >= 0) item.qty = newQty;
      if (!Number.isNaN(newPrice) && newPrice >= 0) item.price = newPrice;
      item.available = item.qty > 0;
      saveDB();
      renderDonorHome();
      showToast("Menu updated.");
    });
  });
}

function foodVisibleFor(currentUser, search = "") {
  const q = search.trim().toLowerCase();
  return state.db.foodItems.filter((item) => {
    if (!item.available || item.qty <= 0) return false;
    const diff = Math.abs(Number(item.donorPincode) - Number(currentUser.pincode));
    const near = Number.isFinite(diff) ? diff <= 20 : item.donorLocation.toLowerCase() === currentUser.location.toLowerCase();
    if (!near) return false;
    if (!q) return true;
    return item.name.toLowerCase().includes(q) || item.donorName.toLowerCase().includes(q) || item.donorLocation.toLowerCase().includes(q);
  });
}

function canOrganizationOrder(orgId) {
  const orgOrders = state.db.orders.filter((o) => o.buyerId === orgId);
  return !orgOrders.some((o) => !state.db.proofs.some((p) => p.orderId === o.id));
}

function isFavorite(userId, donorId) {
  return state.db.favorites.some((f) => f.userId === userId && f.donorId === donorId);
}

function toggleFavorite(userId, donorId) {
  const index = state.db.favorites.findIndex((f) => f.userId === userId && f.donorId === donorId);
  if (index >= 0) state.db.favorites.splice(index, 1);
  else state.db.favorites.push({ id: uid("fav"), userId, donorId, createdAt: new Date().toISOString() });
  saveDB();
}

function renderUserOrOrganizationHome(isOrganization) {
  const user = state.currentUser;
  const blocked = isOrganization ? !canOrganizationOrder(user.id) : false;
  const searchBox = `<div class="row g-2 mb-3"><div class="col-md-6"><input id="restSearch" class="form-control" placeholder="Search restaurant or food item..." /></div><div class="col-md-3"><input id="locSearch" class="form-control" list="locationList" placeholder="Select location" value="${user.location}" /></div><div class="col-md-1 d-grid"><button id="useLocBtn" class="btn btn-outline-primary">Browse</button></div><div class="col-md-2 d-grid"><button id="favOnlyBtn" class="btn btn-outline-dark">Favorites Only</button></div></div>`;
  const offers = [
    "🔥 20% OFF on evening pickups",
    "⭐ Refer and earn reward points",
    "🎉 Surprise meal drops every night",
  ];
  const today = new Date().toISOString().slice(0, 10);
  const todayReward = state.db.rewards.find((r) => r.userId === user.id && r.date === today);

  refs.mainContent.innerHTML = `
    <div class="card glass-card mb-3">
      <div class="card-body">
        <h4 class="section-title">${isOrganization ? "Organization" : "User"} Discover</h4>
        <p class="text-muted mb-2">Only donor-added live items are visible. Search by restaurant or food name.</p>
        <div class="promo-marquee mb-3">${offers.map((o) => `<span>${o}</span>`).join("")}</div>
        <div class="d-flex flex-wrap gap-2 mb-3">
          <button id="spinRewardBtn" class="btn btn-warning" ${todayReward ? "disabled" : ""}>🎡 Spin Daily Reward</button>
          <span class="badge text-bg-light p-2">${todayReward ? `Today's reward: ${todayReward.reward}` : "Spin once daily for a surprise reward!"}</span>
        </div>
        ${isOrganization ? `<div class="alert ${blocked ? "alert-warning" : "alert-info"}">${blocked ? "Upload proof for previous order to place a new one." : "Organization orders skip payment step."}</div>` : ""}
        ${searchBox}
        <div id="listingArea"></div>
      </div>
    </div>
  `;

  let favoritesOnly = false;

  const renderList = () => {
    const search = document.getElementById("restSearch").value;
    const selLoc = document.getElementById("locSearch").value.trim();
    if (selLoc) user.location = selLoc;
    let items = foodVisibleFor(user, search);
    if (favoritesOnly) {
      items = items.filter((i) => isFavorite(user.id, i.donorId));
    }

    const html = items.length === 0
      ? '<div class="empty-state">No donor items available for selected location/search.</div>'
      : `<div class="row g-3">${items.map((item) => `<div class="col-md-6 col-xl-4">
            <div class="card food-card h-100">
              <div class="card-body">
                <h5>${item.name}</h5>
                <p class="mb-1"><strong>Restaurant:</strong> ${item.donorName}</p>
                <p class="mb-1"><strong>Location:</strong> ${item.donorLocation}</p>
                <p class="mb-1"><strong>Available Qty:</strong> ${item.qty}</p>
                <p class="mb-1"><strong>Price:</strong> ₹${item.price}</p>
                <p class="mb-3"><strong>Collect Before:</strong> ${formatDT(item.collectBefore)}</p>
                <div class="d-flex gap-2">
                  <button class="btn btn-outline-danger flex-grow-1" data-fav="${item.donorId}">${isFavorite(user.id, item.donorId) ? "♥ Favorited" : "♡ Favorite"}</button>
                  <button class="btn btn-primary flex-grow-1" ${isOrganization && blocked ? "disabled" : ""} data-order="${item.id}">Place Order</button>
                </div>
              </div>
            </div>
          </div>`).join("")}</div>`;

    document.getElementById("listingArea").innerHTML = html;
    document.querySelectorAll("[data-order]").forEach((btn) => {
      btn.addEventListener("click", () => openOrderModal(btn.dataset.order, isOrganization));
    });
    document.querySelectorAll("[data-fav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        toggleFavorite(user.id, btn.dataset.fav);
        renderList();
      });
    });
  };

  document.getElementById("restSearch").addEventListener("input", renderList);
  document.getElementById("locSearch").addEventListener("change", renderList);
  document.getElementById("favOnlyBtn").addEventListener("click", () => {
    favoritesOnly = !favoritesOnly;
    document.getElementById("favOnlyBtn").textContent = favoritesOnly ? "All Results" : "Favorites Only";
    renderList();
  });
  document.getElementById("useLocBtn").addEventListener("click", async () => {
    const loc = await getLocationText();
    if (loc) {
      document.getElementById("locSearch").value = loc;
      renderList();
      showToast("Location selected.");
    }
  });
  document.getElementById("spinRewardBtn").addEventListener("click", () => {
    const rewardPool = ["₹20 voucher", "10% off pickup", "Free priority slot", "Bonus eco points"];
    const reward = rewardPool[Math.floor(Math.random() * rewardPool.length)];
    state.db.rewards.push({ id: uid("reward"), userId: user.id, reward, date: today });
    saveDB();
    showToast(`You won: ${reward}`);
    renderUserOrOrganizationHome(isOrganization);
  });

  renderList();
}

function openOrderModal(itemId, isOrganization = false) {
  const item = state.db.foodItems.find((f) => f.id === itemId);
  if (!item) return;

  const qty = Number(prompt(`Enter quantity required (max ${item.qty}):`, 1));
  if (!qty || qty < 1 || qty > item.qty) return showToast("Invalid quantity selected.");

  const collectTime = prompt("Enter pickup time (e.g., 19:30):", "19:30");
  if (!collectTime) return;

  let paymentMethod = "N/A for organization";
  if (!isOrganization) {
    paymentMethod = prompt("Payment method: Cash / UPI / Debit Card / Credit Card", "Cash");
    if (!paymentMethod) return;
  }

  const pickupCode = String(Math.floor(10000 + Math.random() * 90000));

  const order = {
    id: uid("order"),
    itemId: item.id,
    itemName: item.name,
    donorId: item.donorId,
    donorName: item.donorName,
    buyerId: state.currentUser.id,
    buyerName: state.currentUser.displayName,
    buyerRole: state.currentUser.role,
    qty,
    collectTime,
    paymentMethod,
    pickupCode,
    codeVerified: false,
    orderedAt: new Date().toISOString(),
    status: "Placed",
  };

  state.db.orders.push(order);
  item.qty -= qty;
  if (item.qty <= 0) item.available = false;
  saveDB();

  showToast(`Order placed. Pickup code: ${pickupCode}`);
  if (state.currentUser.role === "organization") renderUserOrOrganizationHome(true);
  else renderUserOrOrganizationHome(false);
}

function renderDonorOrders() {
  const donorOrders = state.db.orders.filter((o) => o.donorId === state.currentUser.id);
  refs.mainContent.innerHTML = `
    <div class="card glass-card">
      <div class="card-body">
        <h4 class="section-title mb-3">Orders Received</h4>
        ${donorOrders.length === 0 ? '<div class="empty-state">No orders received yet.</div>' : `
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>Item</th><th>Qty</th><th>Buyer</th><th>Pickup</th><th>Order Code</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              ${donorOrders.map((o) => `<tr>
                <td>${o.itemName}</td>
                <td>${o.qty}</td>
                <td>${o.buyerName} (${o.buyerRole})</td>
                <td>${o.collectTime}</td>
                <td class="order-code">${o.pickupCode}</td>
                <td>${o.status}</td>
                <td>${o.status === "Delivered" ? '<span class="text-success fw-semibold">Done</span>' : `<button class="btn btn-sm btn-success" data-verify="${o.id}">Verify & Deliver</button>`}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>`}
      </div>
    </div>`;

  refs.mainContent.querySelectorAll("[data-verify]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const order = state.db.orders.find((o) => o.id === btn.dataset.verify);
      if (!order) return;
      const entered = prompt("Enter pickup verification code provided by user/organization:");
      if (!entered || entered !== order.pickupCode) return showToast("Invalid code. Delivery not marked.");
      order.codeVerified = true;
      order.status = "Delivered";
      saveDB();
      renderDonorOrders();
      showToast("Order verified and marked as delivered.");
    });
  });
}

function renderOrderHistory() {
  const user = state.currentUser;
  const history = state.db.orders.filter((o) => o.buyerId === user.id);

  refs.mainContent.innerHTML = `
    <div class="card glass-card">
      <div class="card-body">
        <h4 class="section-title mb-3">Order History</h4>
        ${history.length === 0 ? '<div class="empty-state">No previous orders.</div>' : `
          <div class="table-responsive">
            <table class="table align-middle">
              <thead><tr><th>Restaurant</th><th>Item</th><th>Qty</th><th>Pickup Code</th><th>Status</th><th>Review</th></tr></thead>
              <tbody>
                ${history.map((o) => {
                  const review = state.db.reviews.find((r) => r.orderId === o.id && r.userId === user.id);
                  return `<tr>
                    <td>${o.donorName}</td>
                    <td>${o.itemName}</td>
                    <td>${o.qty}</td>
                    <td class="order-code">${o.pickupCode}</td>
                    <td>${o.status}</td>
                    <td>${o.status === "Delivered" ? (review ? `⭐ ${review.rating}/5 - ${review.comment}` : `<button class="btn btn-sm btn-outline-primary" data-review="${o.id}">Add Review</button>`) : "--"}</td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>`}
      </div>
    </div>`;

  refs.mainContent.querySelectorAll("[data-review]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const orderId = btn.dataset.review;
      const rating = Number(prompt("Rate delivery and food quality (1-5):", 5));
      if (!rating || rating < 1 || rating > 5) return showToast("Invalid rating.");
      const comment = prompt("Write your review:", "Food was good and pickup smooth.") || "";
      state.db.reviews.push({ id: uid("rev"), orderId, userId: state.currentUser.id, rating, comment, createdAt: new Date().toISOString() });
      saveDB();
      renderOrderHistory();
      showToast("Review submitted.");
    });
  });
}

function renderProofUpload() {
  const org = state.currentUser;
  const orgOrders = state.db.orders.filter((o) => o.buyerId === org.id);
  refs.mainContent.innerHTML = `
    <div class="card glass-card mb-3">
      <div class="card-body">
        <h4 class="section-title mb-3">Upload Delivery Proof</h4>
        <p class="text-muted">Select earlier order and upload image/PDF proof within 12 hours.</p>
        ${orgOrders.length === 0 ? '<div class="empty-state">No organization orders found.</div>' : `
        <form id="proofForm" class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Select Order</label>
            <select id="proofOrder" class="form-select" required>
              <option value="">Choose order</option>
              ${orgOrders.map((o) => `<option value="${o.id}">${o.itemName} - ${o.donorName} (${formatDT(o.orderedAt)})</option>`).join("")}
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Upload Images / PDF</label>
            <input type="file" id="proofFiles" class="form-control" multiple accept="image/*,.pdf" required>
          </div>
          <div class="col-12 d-grid"><button class="btn btn-success" type="submit">Upload Proof</button></div>
        </form>`}
      </div>
    </div>
  `;

  const form = document.getElementById("proofForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const orderId = document.getElementById("proofOrder").value;
    const files = document.getElementById("proofFiles").files;
    if (!orderId || !files.length) return;

    const uploaded = Array.from(files).map((f) => ({ name: f.name, type: f.type || "application/octet-stream" }));
    const existing = state.db.proofs.find((p) => p.orderId === orderId);
    if (existing) {
      existing.files = uploaded;
      existing.uploadedAt = new Date().toISOString();
    } else {
      state.db.proofs.push({
        id: uid("proof"),
        orderId,
        orgId: org.id,
        files: uploaded,
        uploadedAt: new Date().toISOString(),
      });
    }

    saveDB();
    showToast("Proof uploaded.");
    renderProofUpload();
  });
}

async function getLocationText() {
  if (!navigator.geolocation) {
    return prompt("Enter location manually:", "New York");
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => {
        const manual = prompt("Detected location permission. Enter preferred location/city:", "New York");
        resolve(manual || "");
      },
      () => {
        const manual = prompt("Could not detect automatically. Enter location:", "New York");
        resolve(manual || "");
      },
      { timeout: 8000 }
    );
  });
}

function formatDT(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

setAuthMode("login");
