// =============================================================
// common.js — সব প্রোটেক্টেড পেজের শেয়ার্ড কোড
//
// রোল সিস্টেম:
//   👑 মেইন এডমিন  → সব কিছুর কন্ট্রোল (নির্দিষ্ট ইমেইল)
//   🏢 ফাউন্ডার     → যিনি প্রতিষ্ঠান তৈরি করেছেন
//   🛡️ সাব এডমিন   → মেইন এডমিন দেওয়া নির্দিষ্ট পারমিশন অনুযায়ী
//   👤 ইউজার       → শুধু দেখা + রিকোয়েস্ট পাঠানো
//
// প্রতিষ্ঠান (Organization) সিস্টেম:
//   নতুন ইউজার (orgId নেই) → dashboard/founder.html-এ গিয়ে
//   প্রতিষ্ঠান তৈরি করবে বা Join Code দিয়ে যোগ দেবে
// =============================================================

// ⭐⭐ মেইন এডমিনের ইমেইল — শুধু এই লাইনটা বদলালেই মেইন এডমিন বদলে যাবে! ⭐⭐
const MAIN_ADMIN_EMAIL = "sadequelislam93@gmail.com";

// সাব এডমিনের সম্ভাব্য পারমিশনগুলো
const SUB_ADMIN_PERMISSIONS = {
    addIncome: "ফি প্রদান (জমা) সরাসরি করতে পারবে (অনুমোদন ছাড়াই)",
    addExpense: "খরচ সরাসরি করতে পারবে (অনুমোদন ছাড়াই)",
    approveRequests: "ফি ও খরচের রিকোয়েস্ট অনুমোদন/বাতিল করতে পারবে",
    manageLoans: "লোন অনুমোদন ও পরিশোধ করতে পারবে"
};

// -------- মেনু ও পেজের তালিকা --------
// requires: কোন পেজ কারা দেখবে (না থাকলে সবাই)
const APP_PAGES = {
    "dashboard": {
        icon: "fa-house",
        label: "ড্যাশবোর্ড (হোম)",
        title: "ড্যাশবোর্ড (হোম)",
        subtitle: "কোম্পানি নাম্বার: 01856628537"
    },
    "fee-prodan": {
        icon: "fa-hand-holding-dollar",
        label: "ফি প্রদান (জমা)",
        title: "ফি প্রদান (টাকা জমা)"
    },
    "cost": {
        icon: "fa-money-bill-transfer",
        label: "খরচ (ব্যয়)",
        title: "খরচ (ব্যয়) এন্ট্রি"
    },
    "loan-request": {
        icon: "fa-money-check-dollar",
        label: "লোন রিকোয়েস্ট",
        title: "লোন রিকোয়েস্ট পাঠান"
    },
    "ledger": {
        icon: "fa-book-bookmark",
        label: "সকল লেনদেন",
        title: "সকল লেনদেনের লেজার বিবরণী"
    },
    "fee-request": {
        icon: "fa-inbox",
        label: "ফি রিকোয়েস্ট",
        title: "ফি প্রদান রিকোয়েস্ট ম্যানেজমেন্ট",
        subtitle: "ইউজারদের পাঠানো জমার রিকোয়েস্ট — অনুমোদন দিলে মূল তালিকায় যুক্ত হবে",
        requires: "approveRequests"
    },
    "cost-request": {
        icon: "fa-cart-arrow-down",
        label: "খরচ রিকোয়েস্ট",
        title: "খরচ রিকোয়েস্ট ম্যানেজমেন্ট",
        subtitle: "ইউজারদের পাঠানো খরচের রিকোয়েস্ট — অনুমোদন দিলে মূল তালিকায় যুক্ত হবে",
        requires: "approveRequests"
    },
    "loan-manage": {
        icon: "fa-hand-holding-dollar",
        label: "লোন ম্যানেজমেন্ট",
        title: "লোন রিকোয়েস্ট ম্যানেজমেন্ট",
        subtitle: "সকল ইউজারের লোন রিকোয়েস্ট — অনুমোদন দিলে লোন প্রদান করা হবে",
        requires: "manageLoans"
    },
    "sub-admin": {
        icon: "fa-user-shield",
        label: "সাব এডমিন সিলেক্ট",
        title: "সাব এডমিন নির্বাচন ও পারমিশন",
        subtitle: "যেকোনো ইউজারকে নির্দিষ্ট কাজের পারমিশন দিয়ে সাব এডমিন বানান",
        requires: "mainAdmin"
    },
    "settings": {
        icon: "fa-gear",
        label: "সেটিং",
        title: "সেটিং ও কনফিগারেশন"
    }
};

// মেনুতে যে ক্রমে দেখাবে
const PAGE_ORDER = ["dashboard", "fee-prodan", "cost", "loan-request", "ledger",
                    "fee-request", "cost-request", "loan-manage", "sub-admin", "settings"];

// -------- বর্তমান লগইন করা ইউজার ও প্রতিষ্ঠান --------
let currentUser = null;
let subAdminData = null;   // সাব এডমিন হলে তার পারমিশন অবজেক্ট

let currentOrgId = null;   // বর্তমান প্রতিষ্ঠানের আইডি
let currentOrgName = null; // বর্তমান প্রতিষ্ঠানের নাম
let currentOrgRole = null; // ইউজারের রোল (FOUNDER / USER / GUEST)

// -------- বাংলা সংখ্যা --------
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
function toBengaliNumber(n) {
    return String(n).split("").map(d => /\d/.test(d) ? BN_DIGITS[Number(d)] : d).join("");
}

// -------- Safe localStorage helpers --------
function storageGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
}
function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}
function storageRemove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
}

// -------- Firebase প্রস্তুত কিনা --------
function firebaseReady() {
    return typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized && typeof auth !== "undefined" && auth;
}
function firestoreReady() {
    return typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized && typeof db !== "undefined" && db;
}

// =============================================================
// 🎭 রোল চেক ফাংশন
// =============================================================
function isMainAdmin() {
    if (!currentUser) return false;
    const email = (currentUser.email || "").toLowerCase().trim();
    return email === MAIN_ADMIN_EMAIL.toLowerCase().trim();
}

function isSubAdmin() {
    return !!(subAdminData && subAdminData.permissions &&
        Object.values(subAdminData.permissions).some(v => v === true));
}

function isFounder() {
    return currentOrgRole === "FOUNDER";
}

// পারমিশন আছে কিনা (মেইন এডমিনের সব পারমিশনই আছে)
function hasPermission(perm) {
    if (isMainAdmin()) return true;
    return !!(subAdminData && subAdminData.permissions && subAdminData.permissions[perm] === true);
}

// ইউজারের ইউনিক আইডি (Firebase মোডে uid, ডেমো মোডে ইমেইল)
function getUserId() {
    if (!currentUser) return null;
    return currentUser.uid || currentUser.email || null;
}

// =============================================================
// পেজ লোড হলে প্রথমে যা যা হবে
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
    applySavedTheme();   // ১. সেভ করা ডার্ক/লাইট থিম
    renderLayout();      // ২. সাইডবার + টপবার বসানো
    checkAuthState();    // ৩. লগইন যাচাই (না থাকলে লগইন পেজে ফেরত)
});

// কে কোন পেজ দেখতে পারবে
function canSeePage(key) {
    const p = APP_PAGES[key];
    if (!p || !p.requires) return true; // সবাই
    if (p.requires === "mainAdmin") return isMainAdmin();
    if (p.requires === "approveRequests") return hasPermission("approveRequests");
    if (p.requires === "manageLoans") return hasPermission("manageLoans");
    return true;
}

// =============================================================
// সাইডবার + টপবার তৈরি (রোল অনুযায়ী মেনু সাজানো)
// =============================================================
function renderLayout() {
    const currentPage = document.body.getAttribute("data-page") || "dashboard";

    // ---- সাইডবার ----
    const sidebar = document.getElementById("app-sidebar");
    if (sidebar) {
        const visiblePages = PAGE_ORDER.filter(canSeePage);
        const menuHTML = visiblePages.map((key, idx) => {
            const p = APP_PAGES[key];
            const active = (key === currentPage) ? " active" : "";
            return `<a class="nav-item${active}" href="../${key}/">
                        <i class="fa-solid ${p.icon}"></i>
                        <span>${toBengaliNumber(idx + 1)}. ${p.label}</span>
                    </a>`;
        }).join("");

        sidebar.innerHTML = `
            <div class="sidebar-header">
                <i class="fa-solid fa-chart-line"></i>
                <span>একাউন্টস প্যানেল</span>
            </div>
            <nav class="sidebar-menu">
                ${menuHTML}
            </nav>
            <div class="sidebar-footer">
                <div class="user-info">
                    <i class="fa-solid fa-circle-user"></i>
                    <span id="current-user-email">এডমিন</span>
                </div>
                <button id="btn-logout" class="btn-logout" title="লগআউট">
                    <i class="fa-solid fa-power-off"></i>
                </button>
            </div>
        `;

        sidebar.querySelector("#btn-logout").addEventListener("click", handleLogout);
    }

    // ---- টপবার ----
    const topbar = document.getElementById("app-topbar");
    if (topbar) {
        const p = APP_PAGES[currentPage] || { title: "প্যানেল" };
        topbar.innerHTML = `
            <div>
                <h1>${p.title}<span id="role-badge-holder"></span></h1>
                ${p.subtitle ? `<p class="topbar-subtitle">${p.subtitle}</p>` : ""}
            </div>
            <div class="status-badge" id="firebase-status">
                <span class="status-dot online"></span>
                <span id="status-text">অপেক্ষা করুন...</span>
            </div>
        `;
    }
}

// =============================================================
// 🔒 লগইন গার্ড
// =============================================================
function checkAuthState() {
    if (firebaseReady()) {
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                showAppScreen();
            } else {
                redirectLogin();
            }
        });
    } else {
        const savedDemoUser = storageGet("demo_logged_user");
        if (savedDemoUser) {
            try {
                currentUser = JSON.parse(savedDemoUser);
                showAppScreen();
            } catch (e) {
                redirectLogin();
            }
        } else {
            redirectLogin();
        }
    }
}

function redirectLogin() {
    // founder.html ড্যাশবোর্ড ফোল্ডারের ভেতরে, বাকি পেজ এক লেভেল নিচে
    const page = document.body.getAttribute("data-page") || "";
    if (page === "founder") {
        window.location.replace("../index.html");
    } else {
        window.location.replace("../index.html");
    }
}

// লগআউট
function handleLogout() {
    if (firebaseReady()) {
        auth.signOut().then(() => window.location.replace("../index.html"));
    } else {
        storageRemove("demo_logged_user");
        window.location.replace("../index.html");
    }
}

// =============================================================
// লোডিং স্ক্রিন সরিয়ে অ্যাপ দেখানো
// ফ্লো: লগইন ✓ → সাব এডমিন পারমিশন লোড → প্রতিষ্ঠান চেক → পেজ চালু
// =============================================================
function showAppScreen() {
    const loading = document.getElementById("auth-loading");
    const appScreen = document.getElementById("app-screen");
    if (loading) loading.classList.add("hidden");
    if (appScreen) appScreen.classList.remove("hidden");

    // ইউজারের নাম (না থাকলে ইমেইল) সাইডবারে দেখানো
    const displayName = (currentUser && (currentUser.displayName || currentUser.name)) || (currentUser && currentUser.email) || "এডমিন";
    const emailSpan = document.getElementById("current-user-email");
    if (emailSpan) {
        emailSpan.innerText = displayName;
        emailSpan.title = (currentUser && currentUser.email) || "";
    }

    // সাব এডমিন পারমিশন + প্রতিষ্ঠানের তথ্য লোড → তারপর সিদ্ধান্ত
    loadSubAdminStatus()
        .then(loadUserOrg)
        .then(() => {
            const page = document.body.getAttribute("data-page") || "";

            // 🌟 প্রতিষ্ঠান না থাকলে founder পেজে পাঠানো (founder পেজ নিজে বাদে)
            if (!currentOrgId && page !== "founder") {
                if (page === "dashboard") {
                    window.location.replace("founder.html");
                } else {
                    window.location.replace("../dashboard/founder.html");
                }
                return;
            }

            // 🌟 প্রতিষ্ঠান আছে আর founder পেজে ঢুকতে চাইলে → ড্যাশবোর্ডে
            if (currentOrgId && page === "founder") {
                window.location.replace("index.html");
                return;
            }

            renderLayout();          // পারমিশন জানার পর মেনু নতুন করে সাজানো
            renderRoleBadge();       // রোল ব্যাজ
            updateFirebaseStatusBadge();

            // প্রতিটা পেজের নিজস্ব onPageReady() ফাংশন থাকলে সেটা চালানো হয়
            if (typeof onPageReady === "function") {
                onPageReady(currentUser);
            }
        });
}

// =============================================================
// প্রতিষ্ঠানের তথ্য লোড (users ডকুমেন্ট থেকে)
// =============================================================
function loadUserOrg() {
    if (firestoreReady()) {
        return db.collection("users").doc(getUserId()).get()
            .then(doc => {
                if (doc.exists) {
                    const d = doc.data();
                    currentOrgId = d.orgId || null;
                    currentOrgName = d.orgName || null;
                    currentOrgRole = d.role || null;
                }
            })
            .catch(err => {
                console.warn("User org load error:", err);
            });
    } else {
        // ডেমো মোড: demo_logged_user-এর ভেতরে সেভ থাকে
        try {
            const u = storageGet("demo_logged_user");
            if (u) {
                const p = JSON.parse(u);
                currentOrgId = p.orgId || null;
                currentOrgName = p.orgName || null;
                currentOrgRole = p.role || null;
            }
        } catch (e) { /* ignore */ }
        return Promise.resolve();
    }
}

// ডেমো মোডে প্রতিষ্ঠানের তথ্য সেভ
function saveDemoOrg(orgId, orgName, role) {
    try {
        const u = JSON.parse(storageGet("demo_logged_user") || "{}");
        u.orgId = orgId;
        u.orgName = orgName;
        u.role = role;
        storageSet("demo_logged_user", JSON.stringify(u));
        currentOrgId = orgId;
        currentOrgName = orgName;
        currentOrgRole = role;
    } catch (e) { /* ignore */ }
}

// =============================================================
// সাব এডমিনের পারমিশন লোড (Firebase: sub_admins/{uid}, ডেমো: localStorage)
// =============================================================
function loadSubAdminStatus() {
    if (firestoreReady()) {
        return db.collection("sub_admins").doc(getUserId()).get()
            .then(doc => {
                subAdminData = doc.exists ? doc.data() : null;
            })
            .catch(err => {
                console.warn("Sub-admin load error:", err);
                subAdminData = null;
            });
    } else {
        try {
            const all = JSON.parse(storageGet("sub_admins_local") || "{}");
            const key = ((currentUser && currentUser.email) || "").toLowerCase();
            subAdminData = all[key] || null;
        } catch (e) {
            subAdminData = null;
        }
        return Promise.resolve();
    }
}

// রোল ব্যাজ আঁকা
function renderRoleBadge() {
    const holder = document.getElementById("role-badge-holder");
    if (!holder) return;

    if (isMainAdmin()) {
        holder.innerHTML = ' <span class="role-badge role-admin"><i class="fa-solid fa-shield-halved"></i> মেইন এডমিন</span>';
    } else if (isSubAdmin()) {
        holder.innerHTML = ' <span class="role-badge role-subadmin"><i class="fa-solid fa-user-shield"></i> সাব এডমিন</span>';
    } else if (isFounder()) {
        holder.innerHTML = ' <span class="role-badge role-founder"><i class="fa-solid fa-building"></i> ফাউন্ডার</span>';
    } else {
        holder.innerHTML = ' <span class="role-badge role-user"><i class="fa-solid fa-user"></i> ইউজার</span>';
    }
}

// Firebase অনলাইন/অফলাইন ব্যাজ
function updateFirebaseStatusBadge() {
    const statusText = document.getElementById("status-text");
    const dot = document.querySelector(".status-dot");
    if (!statusText) return;

    if (typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized) {
        statusText.innerText = "অনলাইন মোড (Firebase Sync)";
        if (dot) dot.className = "status-dot online";
    } else {
        statusText.innerText = "অফলাইন / ডেমো মোড (Local)";
        if (dot) dot.className = "status-dot offline";
    }
}

// =============================================================
// থিম (ডার্ক / লাইট মোড) — সেভ হয়ে থাকে
// =============================================================
function applySavedTheme() {
    if (storageGet("theme_preference") === "dark") {
        document.body.classList.add("dark-theme");
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle("dark-theme");
    storageSet("theme_preference", isDark ? "dark" : "light");
}
