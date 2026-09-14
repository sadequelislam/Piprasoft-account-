// Application Main JavaScript

// Local Storage Fallback Data Key
const STORAGE_KEY = "accounts_ledger_transactions";

// Initial Demo Data if empty
const defaultTransactions = [
    {
        id: "demo-1",
        type: "INCOME",
        name: "মাসিক ফি - আব্দুল করিম",
        category: "মাসিক ফি",
        amount: 3000,
        date: "2026-03-01",
        note: "মার্চ মাসের ফি জমা",
        adminName: "সুপার এডমিন",
        createdAt: new Date().toISOString()
    },
    {
        id: "demo-2",
        type: "EXPENSE",
        name: "বিদ্যুৎ বিল - মার্চ",
        category: "বিদ্যুৎ / ইউটিলিটি",
        amount: 1200,
        date: "2026-03-02",
        note: "মিটার নং #88321",
        adminName: "সুপার এডমিন",
        createdAt: new Date().toISOString()
    }
];

// App State
let transactions = [];
let currentUser = null;

// DOM Elements
const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const loginForm = document.getElementById("login-form");
const loginEmailInput = document.getElementById("login-email");
const loginPassInput = document.getElementById("login-password");
const loginAlert = document.getElementById("login-alert");

const currentUserEmailSpan = document.getElementById("current-user-email");
const btnLogout = document.getElementById("btn-logout");

const navItems = document.querySelectorAll(".nav-item");
const tabContents = document.querySelectorAll(".tab-content");
const pageTitle = document.getElementById("page-title");
const firebaseStatusDot = document.getElementById("status-text");

// Form Elements
const formIncome = document.getElementById("form-income");
const formExpense = document.getElementById("form-expense");
const formFbConfig = document.getElementById("form-firebase-config");

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    // Set Default Dates to Today
    const today = new Date().toISOString().split("T")[0];
    if (document.getElementById("inc-date")) document.getElementById("inc-date").value = today;
    if (document.getElementById("exp-date")) document.getElementById("exp-date").value = today;

    // Check Firebase saved config in setting inputs
    populateFirebaseInputs();

    // Check Login State
    checkAuthState();

    // Navigation Listener
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const tabName = item.getAttribute("data-tab");
            switchTab(tabName);
        });
    });

    // Forms Handlers
    loginForm.addEventListener("submit", handleLogin);
    btnLogout.addEventListener("click", handleLogout);
    
    if (formIncome) formIncome.addEventListener("submit", handleIncomeSubmit);
    if (formExpense) formExpense.addEventListener("submit", handleExpenseSubmit);
    if (formFbConfig) formFbConfig.addEventListener("submit", handleFirebaseConfigSave);

    // Ledger Filter & Export
    document.getElementById("ledger-filter-type")?.addEventListener("change", renderLedgerTable);
    document.getElementById("btn-export-csv")?.addEventListener("click", exportToCSV);
    document.getElementById("btn-toggle-theme")?.addEventListener("click", toggleTheme);
    document.getElementById("btn-reset-demo")?.addEventListener("click", resetDemoData);
});

// Authentication Handling
function handleLogin(e) {
    e.preventDefault();
    const email = loginEmailInput.value.trim();
    const password = loginPassInput.value.trim();

    if (isFirebaseInitialized && auth) {
        // Firebase Login
        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                currentUser = userCredential.user;
                showAppScreen();
            })
            .catch(error => {
                showLoginError("লগইন ভুল হয়েছে: " + error.message);
            });
    } else {
        // Local Demo Mode Login
        currentUser = { email: email || "admin@demo.com" };
        localStorage.setItem("demo_logged_user", JSON.stringify(currentUser));
        showAppScreen();
    }
}

function checkAuthState() {
    if (isFirebaseInitialized && auth) {
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                showAppScreen();
            } else {
                showLoginScreen();
            }
        });
    } else {
        const savedDemoUser = localStorage.getItem("demo_logged_user");
        if (savedDemoUser) {
            currentUser = JSON.parse(savedDemoUser);
            showAppScreen();
        } else {
            showLoginScreen();
        }
    }
}

function handleLogout() {
    if (isFirebaseInitialized && auth) {
        auth.signOut().then(() => showLoginScreen());
    } else {
        localStorage.removeItem("demo_logged_user");
        showLoginScreen();
    }
}

function showLoginScreen() {
    loginScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
}

function showAppScreen() {
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    
    currentUserEmailSpan.innerText = currentUser.email || "এডমিন";
    
    updateFirebaseStatusBadge();
    loadTransactionsData();
}

function showLoginError(msg) {
    loginAlert.innerText = msg;
    loginAlert.classList.remove("hidden");
}

function updateFirebaseStatusBadge() {
    if (isFirebaseInitialized) {
        firebaseStatusDot.innerText = "অনলাইন মোড (Firebase Sync)";
        document.querySelector(".status-dot").className = "status-dot online";
    } else {
        firebaseStatusDot.innerText = "অফলাইন / ডেমো মোড (Local)";
        document.querySelector(".status-dot").className = "status-dot offline";
    }
}

// Tab Switching Logic
function switchTab(tabName) {
    navItems.forEach(item => {
        if (item.getAttribute("data-tab") === tabName) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    tabContents.forEach(content => {
        if (content.id === `tab-${tabName}`) {
            content.classList.add("active");
        } else {
            content.classList.remove("active");
        }
    });

    // Update Titles
    const titles = {
        'dashboard': '১. ড্যাশবোর্ড (হোম)',
        'fee-prodan': '২. ফি প্রদান (টাকা জমা)',
        'cost': '৩. খরচ (ব্যয়)',
        'ledger': '৪. সকল লেনদেনের লেজার',
        'settings': '৫. সেটিং ও কনফিগারেশন'
    };
    pageTitle.innerText = titles[tabName] || "ড্যাশবোর্ড";
}

// Data Handling (Firebase + LocalStorage fallback)
function loadTransactionsData() {
    if (isFirebaseInitialized && db) {
        // Realtime Firebase Listener for all admins
        db.collection("transactions").orderBy("createdAt", "desc")
            .onSnapshot(snapshot => {
                transactions = [];
                snapshot.forEach(doc => {
                    transactions.push({ id: doc.id, ...doc.data() });
                });
                calculateMetrics();
                renderRecentTransactions();
                renderLedgerTable();
            }, error => {
                console.error("Firestore Listen Error:", error);
                loadFromLocalStorage();
            });
    } else {
        loadFromLocalStorage();
    }
}

function loadFromLocalStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        transactions = JSON.parse(data);
    } else {
        transactions = defaultTransactions;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    }
    calculateMetrics();
    renderRecentTransactions();
    renderLedgerTable();
}

function saveTransaction(item) {
    const adminNameInput = document.getElementById("admin-display-name").value || "এডমিন";
    item.adminName = adminNameInput;
    item.createdAt = new Date().toISOString();

    if (isFirebaseInitialized && db) {
        db.collection("transactions").add(item)
            .then(() => alert("সাফল্যের সাথে যুক্ত করা হয়েছে!"))
            .catch(err => alert("ত্রুটি: " + err.message));
    } else {
        item.id = "local-" + Date.now();
        transactions.unshift(item);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        alert("সাফল্যের সাথে জমা হয়েছে (ডেমো মোড)!");
        calculateMetrics();
        renderRecentTransactions();
        renderLedgerTable();
    }
}

function deleteTransaction(id) {
    if (!confirm("আপনি কি নিশ্চিত যে এই লেনদেনটি মুছে ফেলতে চান?")) return;

    if (isFirebaseInitialized && db) {
        db.collection("transactions").doc(id).delete()
            .then(() => alert("লেনদেন মুছে ফেলা হয়েছে!"))
            .catch(err => alert("ত্রুটি: " + err.message));
    } else {
        transactions = transactions.filter(t => t.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        alert("লেনদেন মুছে ফেলা হয়েছে!");
        calculateMetrics();
        renderRecentTransactions();
        renderLedgerTable();
    }
}

// Submissions
function handleIncomeSubmit(e) {
    e.preventDefault();
    const newItem = {
        type: "INCOME",
        name: document.getElementById("inc-name").value.trim(),
        amount: parseFloat(document.getElementById("inc-amount").value),
        category: document.getElementById("inc-category").value,
        date: document.getElementById("inc-date").value,
        note: document.getElementById("inc-note").value.trim()
    };
    saveTransaction(newItem);
    formIncome.reset();
    document.getElementById("inc-date").value = new Date().toISOString().split("T")[0];
    switchTab("dashboard");
}

function handleExpenseSubmit(e) {
    e.preventDefault();
    const newItem = {
        type: "EXPENSE",
        name: document.getElementById("exp-title").value.trim(),
        amount: parseFloat(document.getElementById("exp-amount").value),
        category: document.getElementById("exp-category").value,
        date: document.getElementById("exp-date").value,
        note: document.getElementById("exp-note").value.trim()
    };
    saveTransaction(newItem);
    formExpense.reset();
    document.getElementById("exp-date").value = new Date().toISOString().split("T")[0];
    switchTab("dashboard");
}

// Metrics Calculation
function calculateMetrics() {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        if (t.type === "INCOME") {
            totalIncome += Number(t.amount || 0);
        } else if (t.type === "EXPENSE") {
            totalExpense += Number(t.amount || 0);
        }
    });

    const currentBalance = totalIncome - totalExpense;

    document.getElementById("dash-total-income").innerText = totalIncome.toLocaleString("bn-BD");
    document.getElementById("dash-total-expense").innerText = totalExpense.toLocaleString("bn-BD");
    document.getElementById("dash-current-balance").innerText = currentBalance.toLocaleString("bn-BD");
}

// Render Dashboard Table
function renderRecentTransactions() {
    const tbody = document.getElementById("recent-transactions-tbody");
    if (!tbody) return;

    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">কোনো লেনদেন পাওয়া যায়নি</td></tr>';
        return;
    }

    const recents = transactions.slice(0, 5);
    tbody.innerHTML = recents.map(t => `
        <tr>
            <td>${t.date || '-'}</td>
            <td>
                <span class="badge ${t.type === 'INCOME' ? 'badge-income' : 'badge-expense'}">
                    ${t.type === 'INCOME' ? 'জমা' : 'খরচ'}
                </span>
            </td>
            <td><strong>${t.name}</strong> <br><small class="text-muted">${t.category}</small></td>
            <td>৳ ${Number(t.amount).toLocaleString("bn-BD")}</td>
            <td><small>${t.adminName || 'এডমিন'}</small></td>
        </tr>
    `).join('');
}

// Render Ledger Table
function renderLedgerTable() {
    const tbody = document.getElementById("ledger-tbody");
    const filterType = document.getElementById("ledger-filter-type")?.value || "ALL";
    if (!tbody) return;

    let filtered = transactions;
    if (filterType !== "ALL") {
        filtered = transactions.filter(t => t.type === filterType);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">কোনো তথ্য পাওয়া যায়নি</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(t => `
        <tr>
            <td>${t.date || '-'}</td>
            <td>
                <span class="badge ${t.type === 'INCOME' ? 'badge-income' : 'badge-expense'}">
                    ${t.type === 'INCOME' ? 'জমা' : 'খরচ'}
                </span>
            </td>
            <td><strong>${t.name}</strong> <br><small class="text-muted">${t.category}</small></td>
            <td>${t.note || '-'}</td>
            <td><strong>৳ ${Number(t.amount).toLocaleString("bn-BD")}</strong></td>
            <td>${t.adminName || 'এডমিন'}</td>
            <td>
                <button class="btn btn-outline-danger btn-sm" onclick="deleteTransaction('${t.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Firebase Config Save
function handleFirebaseConfigSave(e) {
    e.preventDefault();
    const config = {
        apiKey: document.getElementById("fb-apiKey").value.trim(),
        authDomain: document.getElementById("fb-authDomain").value.trim(),
        projectId: document.getElementById("fb-projectId").value.trim(),
        storageBucket: document.getElementById("fb-storageBucket").value.trim(),
        messagingSenderId: document.getElementById("fb-messagingSenderId").value.trim(),
        appId: document.getElementById("fb-appId").value.trim(),
    };

    localStorage.setItem('user_firebase_config', JSON.stringify(config));
    alert("ফায়ারবেস কনফিগ সেভ করা হয়েছে! পেজটি রিফ্রেশ হচ্ছে...");
    window.location.reload();
}

function populateFirebaseInputs() {
    const savedConfig = localStorage.getItem('user_firebase_config');
    if (savedConfig) {
        const c = JSON.parse(savedConfig);
        if (document.getElementById("fb-apiKey")) document.getElementById("fb-apiKey").value = c.apiKey || '';
        if (document.getElementById("fb-authDomain")) document.getElementById("fb-authDomain").value = c.authDomain || '';
        if (document.getElementById("fb-projectId")) document.getElementById("fb-projectId").value = c.projectId || '';
        if (document.getElementById("fb-storageBucket")) document.getElementById("fb-storageBucket").value = c.storageBucket || '';
        if (document.getElementById("fb-messagingSenderId")) document.getElementById("fb-messagingSenderId").value = c.messagingSenderId || '';
        if (document.getElementById("fb-appId")) document.getElementById("fb-appId").value = c.appId || '';
    }
}

// CSV Export
function exportToCSV() {
    if (transactions.length === 0) {
        alert("এক্সপোর্ট করার মতো কোনো ডাটা নেই!");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,﻿";
    csvContent += "তারিখ,ধরন,শিরোনাম,ক্যাটাগরি,বিবরণ,পরিমাণ(টাকা),এডমিন\n";

    transactions.forEach(t => {
        const row = [
            `"${t.date || ''}"`,
            `"${t.type === 'INCOME' ? 'জমা' : 'খরচ'}"`,
            `"${t.name || ''}"`,
            `"${t.category || ''}"`,
            `"${t.note || ''}"`,
            `"${t.amount || 0}"`,
            `"${t.adminName || 'এডমিন'}"`
        ].join(",");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ledger_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Toggle Dark Mode
function toggleTheme() {
    document.body.classList.toggle("dark-theme");
}

// Reset Demo Data
function resetDemoData() {
    if (confirm("আপনি কি সমস্ত লোকাল ডেমো ডাটা রিসেট করতে চান?")) {
        localStorage.removeItem(STORAGE_KEY);
        loadFromLocalStorage();
        alert("ডেমো ডাটা রিসেট করা হয়েছে!");
    }
}
