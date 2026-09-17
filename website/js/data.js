// =============================================================
// data.js — লেনদেন (আয় / খরচ) সংক্রান্ত শেয়ার্ড ডাটা লেয়ার
//
// যেসব পেজ এই ফাইল ব্যবহার করে:
//   dashboard/, fee-prodan/, cost/, ledger/, settings/
//
// Firebase থাকলে Firestore থেকে রিয়েল-টাইম ডাটা,
// না থাকলে localStorage (ডেমো মোড)।
// =============================================================

// -------- Keys --------
const STORAGE_KEY = "accounts_ledger_transactions";
const ADMIN_NAME_KEY = "admin_display_name";
const LOAN_STORAGE_KEY = "loan_requests_local";

// -------- ডেমো ডাটা (প্রথমবার খালি থাকলে) --------
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

// -------- State --------
let transactions = [];
let txNotify = null; // ডাটা বদলালে কোন ফাংশনকে জানানো হবে

// =============================================================
// ডাটা লোড (Firebase রিয়েল-টাইম লিসেনার / localStorage)
// onUpdate: প্রতিবার ডাটা বদলালে এই ফাংশন ডাকা হবে
// =============================================================
function initTransactionsListener(onUpdate) {
    txNotify = onUpdate;

    if (firestoreReady()) {
        db.collection("transactions").orderBy("createdAt", "desc")
            .onSnapshot(snapshot => {
                transactions = [];
                snapshot.forEach(doc => {
                    transactions.push({ id: doc.id, ...doc.data() });
                });
                notifyTx();
            }, error => {
                console.error("Firestore Listen Error:", error);
                loadFromLocalStorage();
            });
    } else {
        loadFromLocalStorage();
    }
}

function loadFromLocalStorage() {
    const data = storageGet(STORAGE_KEY);
    if (data) {
        try {
            transactions = JSON.parse(data);
        } catch (e) {
            transactions = [];
        }
    } else {
        transactions = defaultTransactions.slice();
        storageSet(STORAGE_KEY, JSON.stringify(transactions));
    }
    notifyTx();
}

function notifyTx() {
    if (typeof txNotify === "function") txNotify(transactions);
}

// =============================================================
// নতুন লেনদেন সেভ (আয় / খরচ)
// item: { type: "INCOME"/"EXPENSE", name, amount, category, date, note }
// onSuccess: সফল হলে কী হবে (যেমন ড্যাশবোর্ডে ফেরত যাওয়া)
// =============================================================
function saveTransaction(item, onSuccess) {
    item.adminName = getAdminName();
    item.createdAt = new Date().toISOString();

    if (firestoreReady()) {
        db.collection("transactions").add(item)
            .then(() => {
                alert("সাফল্যের সাথে যুক্ত করা হয়েছে!");
                if (typeof onSuccess === "function") onSuccess();
            })
            .catch(err => alert("ত্রুটি: " + err.message));
    } else {
        item.id = "local-" + Date.now();
        transactions.unshift(item);
        storageSet(STORAGE_KEY, JSON.stringify(transactions));
        alert("সাফল্যের সাথে জমা হয়েছে (ডেমো মোড)!");
        notifyTx();
        if (typeof onSuccess === "function") onSuccess();
    }
}

// লেনদেন মুছে ফেলা
function deleteTransaction(id) {
    if (!confirm("আপনি কি নিশ্চিত যে এই লেনদেনটি মুছে ফেলতে চান?")) return;

    if (firestoreReady()) {
        db.collection("transactions").doc(id).delete()
            .then(() => alert("লেনদেন মুছে ফেলা হয়েছে!"))
            .catch(err => alert("ত্রুটি: " + err.message));
    } else {
        transactions = transactions.filter(t => t.id !== id);
        storageSet(STORAGE_KEY, JSON.stringify(transactions));
        alert("লেনদেন মুছে ফেলা হয়েছে!");
        notifyTx();
    }
}

// =============================================================
// এডমিনের নাম (সেটিং পেজ থেকে সেভ করা থাকে)
// =============================================================
function getAdminName() {
    const saved = storageGet(ADMIN_NAME_KEY);
    if (saved) return saved;
    if (typeof currentUser !== "undefined" && currentUser) {
        return currentUser.displayName || currentUser.name || currentUser.email || "এডমিন";
    }
    return "এডমিন";
}

function setAdminName(name) {
    storageSet(ADMIN_NAME_KEY, name);
}

// =============================================================
// মেট্রিক্স হিসাব (মোট জমা, মোট খরচ, বর্তমান ক্যাশ)
// =============================================================
function calculateMetrics(list) {
    let totalIncome = 0;
    let totalExpense = 0;

    (list || transactions).forEach(t => {
        if (t.type === "INCOME") {
            totalIncome += Number(t.amount || 0);
        } else if (t.type === "EXPENSE") {
            totalExpense += Number(t.amount || 0);
        }
    });

    return {
        totalIncome: totalIncome,
        totalExpense: totalExpense,
        balance: totalIncome - totalExpense
    };
}

// =============================================================
// টেবিল রেন্ডারিং
// =============================================================

// ছোট হেল্পার: HTML-এ বিশেষ চিহ্ন এস্কেপ করা
function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ড্যাশবোর্ডের "সাম্প্রতিক লেনদেন" টেবিল
function renderRecentTransactions(tbodyId, list) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const data = list || transactions;
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">কোনো লেনদেন পাওয়া যায়নি</td></tr>`;
        return;
    }

    tbody.innerHTML = data.slice(0, 5).map(t => `
        <tr>
            <td>${escapeHtml(t.date) || '-'}</td>
            <td>
                <span class="badge ${t.type === 'INCOME' ? 'badge-income' : 'badge-expense'}">
                    ${t.type === 'INCOME' ? 'জমা' : 'খরচ'}
                </span>
            </td>
            <td><strong>${escapeHtml(t.name)}</strong> <br><small class="text-muted">${escapeHtml(t.category)}</small></td>
            <td>৳ ${Number(t.amount || 0).toLocaleString("bn-BD")}</td>
            <td><small>${escapeHtml(t.adminName) || 'এডমিন'}</small></td>
        </tr>
    `).join("");
}

// লেজার পেজের বড় টেবিল (ফিল্টার সহ)
function renderLedgerTable(tbodyId, filterType) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    let filtered = transactions;
    if (filterType && filterType !== "ALL") {
        filtered = transactions.filter(t => t.type === filterType);
    }

    if (!filtered || filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">কোনো তথ্য পাওয়া যায়নি</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(t => `
        <tr>
            <td>${escapeHtml(t.date) || '-'}</td>
            <td>
                <span class="badge ${t.type === 'INCOME' ? 'badge-income' : 'badge-expense'}">
                    ${t.type === 'INCOME' ? 'জমা' : 'খরচ'}
                </span>
            </td>
            <td><strong>${escapeHtml(t.name)}</strong> <br><small class="text-muted">${escapeHtml(t.category)}</small></td>
            <td>${escapeHtml(t.note) || '-'}</td>
            <td><strong>৳ ${Number(t.amount || 0).toLocaleString("bn-BD")}</strong></td>
            <td>${escapeHtml(t.adminName) || 'এডমিন'}</td>
            <td>
                <button class="btn btn-outline-danger btn-sm" onclick="deleteTransaction('${escapeHtml(t.id)}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join("");
}

// =============================================================
// CSV এক্সপোর্ট
// =============================================================
function exportToCSV() {
    if (!transactions || transactions.length === 0) {
        alert("এক্সপোর্ট করার মতো কোনো ডাটা নেই!");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\ufeff";
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
