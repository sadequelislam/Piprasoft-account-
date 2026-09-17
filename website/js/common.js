// =============================================================
// common.js — সব প্রোটেক্টেড পেজের শেয়ার্ড কোড
//
// এখানে আছে:
//   ১. সাইডবার + টপবার অটো তৈরি (সব পেজে একই মেনু)
//   ২. লগইন গার্ড (লগইন ছাড়া ঢুকলে লগইন পেজে ফেরত)
//   ৩. লগআউট
//   ৪. থিম / ডার্ক মোড (সেভ হয়ে থাকে)
//   ৫. Firebase স্ট্যাটাস ব্যাজ
//
// 🔑 নতুন মেনু/পেজ যোগ করতে চাইলে শুধু নিচের
//    APP_PAGES আর PAGE_ORDER বদলালেই হবে —
//    সব পেজের সাইডবারে অটো দেখা যাবে!
// =============================================================

// -------- মেনু ও পেজের তালিকা --------
const APP_PAGES = {
    "dashboard": {
        num: "১",
        icon: "fa-house",
        label: "ড্যাশবোর্ড (হোম)",
        title: "ড্যাশবোর্ড (হোম)",
        subtitle: "কোম্পানি নাম্বার: 01856628537"
    },
    "fee-prodan": {
        num: "২",
        icon: "fa-hand-holding-dollar",
        label: "ফি প্রদান (জমা)",
        title: "ফি প্রদান (টাকা জমা)"
    },
    "cost": {
        num: "৩",
        icon: "fa-money-bill-transfer",
        label: "খরচ (ব্যয়)",
        title: "খরচ (ব্যয়) এন্ট্রি"
    },
    "loan-request": {
        num: "৪",
        icon: "fa-money-check-dollar",
        label: "লোন রিকোয়েস্ট",
        title: "লোন রিকোয়েস্ট"
    },
    "ledger": {
        num: "৫",
        icon: "fa-book-bookmark",
        label: "সকল লেনদেন",
        title: "সকল লেনদেনের লেজার বিবরণী"
    },
    "settings": {
        num: "৬",
        icon: "fa-gear",
        label: "সেটিং",
        title: "সেটিং ও কনফিগারেশন"
    }
};

// মেনুতে যে ক্রমে দেখাবে
const PAGE_ORDER = ["dashboard", "fee-prodan", "cost", "loan-request", "ledger", "settings"];

// -------- বর্তমান লগইন করা ইউজার --------
let currentUser = null;

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
// পেজ লোড হলে প্রথমে যা যা হবে
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
    applySavedTheme();   // ১. সেভ করা ডার্ক/লাইট থিম
    renderLayout();      // ২. সাইডবার + টপবার বসানো
    checkAuthState();    // ৩. লগইন যাচাই (না থাকলে লগইন পেজে ফেরত)
});

// =============================================================
// সাইডবার + টপবার তৈরি (প্রতিটা পেজে অটো বসে যায়)
// =============================================================
function renderLayout() {
    const currentPage = document.body.getAttribute("data-page") || "dashboard";

    // ---- সাইডবার ----
    const sidebar = document.getElementById("app-sidebar");
    if (sidebar) {
        const menuHTML = PAGE_ORDER.map(key => {
            const p = APP_PAGES[key];
            const active = (key === currentPage) ? " active" : "";
            return `<a class="nav-item${active}" href="../${key}/">
                        <i class="fa-solid ${p.icon}"></i>
                        <span>${p.num}. ${p.label}</span>
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
        const p = APP_PAGES[currentPage];
        topbar.innerHTML = `
            <div>
                <h1>${p.title}</h1>
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
// 🔒 লগইন গার্ড — লগইন ছাড়া ঢুকলে লগইন পেজে ফেরত
// =============================================================
function checkAuthState() {
    if (firebaseReady()) {
        // Firebase মোড: আসল টোকেন যাচাই
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                showAppScreen();
            } else {
                redirectLogin();
            }
        });
    } else {
        // ডেমো মোড: লোকাল সেভ করা ইউজার চেক
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
    window.location.replace("../index.html");
}

// লগআউট
function handleLogout() {
    if (firebaseReady()) {
        auth.signOut().then(() => redirectLogin());
    } else {
        storageRemove("demo_logged_user");
        redirectLogin();
    }
}

// লোডিং স্ক্রিন সরিয়ে অ্যাপ দেখানো
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

    updateFirebaseStatusBadge();

    // প্রতিটা পেজের নিজস্ব onPageReady() ফাংশন থাকলে সেটা চালানো হয়
    if (typeof onPageReady === "function") {
        onPageReady(currentUser);
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
