// =============================================================
// data.js — ডাটা লেয়ার (রোল + রিকোয়েস্ট + প্রতিষ্ঠান সিস্টেম)
//
// রোল অনুযায়ী:
//   👑 মেইন এডমিন     → সব প্রতিষ্ঠানের সব কিছু দেখেন, সব পারেন
//   🏢 ফাউন্ডার        → নিজের প্রতিষ্ঠানের ডাটা
//   🛡️ সাব এডমিন     → পারমিশন অনুযায়ী (সরাসরি জমা/খরচ, রিকোয়েস্ট অনুমোদন, লোন ম্যানেজ)
//   👤 ইউজার         → নিজের প্রতিষ্ঠান দেখা + রিকোয়েস্ট পাঠানো
//
// প্রতিষ্ঠান ফিল্টার:
//   প্রতিটি রেকর্ডে orgId থাকে — ইউজার শুধু নিজের প্রতিষ্ঠানের
//   ডাটা দেখেন (মেইন এডমিন সব দেখেন)
// =============================================================

// -------- Keys --------
const STORAGE_KEY = "accounts_ledger_transactions";
const PENDING_STORAGE_KEY = "pending_entries_local";
const LOAN_STORAGE_KEY = "loan_requests_local";
const ADMIN_NAME_KEY = "admin_display_name";
const SUB_ADMIN_STORAGE_KEY = "sub_admins_local";

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

// -------- স্ট্যাটাস --------
const PENDING_STATUS_LABEL = { "PENDING": "অপেক্ষমান", "APPROVED": "অনুমোদিত", "REJECTED": "বাতিল" };
const PENDING_STATUS_BADGE = { "PENDING": "badge-pending", "APPROVED": "badge-paid", "REJECTED": "badge-expense" };

const LOAN_STATUS_LABEL = { "PENDING": "অপেক্ষমান", "APPROVED": "অনুমোদিত", "PAID": "পরিশোধিত" };
const LOAN_STATUS_BADGE = { "PENDING": "badge-pending", "APPROVED": "badge-approved", "PAID": "badge-paid" };

// =============================================================
// State
// =============================================================
let transactions = [];
let txNotify = null;

let pendingEntries = [];
let pendingNotify = null;

let loanRequests = [];
let loanNotify = null;

// =============================================================
// 🏢 প্রতিষ্ঠান ফিল্টার হেল্পার
// (মেইন এডমিন সব দেখেন; ডেমো মোডে ফিল্টার বন্ধ; বাকিরা নিজের প্রতিষ্ঠান)
// =============================================================
function orgMatch(doc) {
    if (!firestoreReady()) return true;        // ডেমো মোড: সব লোকাল ডাটা
    if (isMainAdmin()) return true;            // মেইন এডমিন: সব প্রতিষ্ঠান
    if (!currentOrgId) return true;            // প্রতিষ্ঠান নেই (রিডাইরেক্ট হবে)
    return doc.orgId === currentOrgId;         // নিজের প্রতিষ্ঠান
}

// =============================================================
// মূল লেনদেন লোড (Firebase রিয়েল-টাইম / localStorage)
// =============================================================
function initTransactionsListener(onUpdate) {
    txNotify = onUpdate;

    if (firestoreReady()) {
        db.collection("transactions").orderBy("createdAt", "desc")
            .onSnapshot(snapshot => {
                transactions = [];
                snapshot.forEach(doc => {
                    const d = { id: doc.id, ...doc.data() };
                    if (orgMatch(d)) transactions.push(d);
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
// নতুন লেনদেন সেভ
//   👑 মেইন এডমিন / 🛡️ পারমিশন থাকা সাব এডমিন → সরাসরি মূল তালিকায়
//   👤 বাকি সবাই → pending_entries-তে রিকোয়েস্ট হিসেবে
// =============================================================
function saveTransaction(item, onSuccess) {
    item.adminName = getAdminName();
    item.createdAt = new Date().toISOString();
    item.createdBy = getUserId();
    item.creatorEmail = currentUser ? (currentUser.email || "") : "";
    item.orgId = currentOrgId || null;      // 🏢 প্রতিষ্ঠানের আইডি

    const permNeeded = item.type === "INCOME" ? "addIncome" : "addExpense";
    const directSave = hasPermission(permNeeded);

    if (directSave) {
        // ---------- সরাসরি মূল তালিকায় যুক্ত হবে ----------
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
    } else {
        // ---------- রিকোয়েস্ট হিসেবে এডমিনের কাছে যাবে ----------
        item.status = "PENDING";
        if (firestoreReady()) {
            db.collection("pending_entries").add(item)
                .then(() => {
                    alert("আপনার এন্ট্রিটি এডমিনের কাছে রিকোয়েস্ট হিসেবে পাঠানো হয়েছে!\nঅনুমোদন পেলে মূল তালিকায় যুক্ত হবে।");
                    if (typeof onSuccess === "function") onSuccess();
                })
                .catch(err => alert("ত্রুটি: " + err.message));
        } else {
            const all = JSON.parse(storageGet(PENDING_STORAGE_KEY) || "[]");
            item.id = "local-" + Date.now();
            all.unshift(item);
            storageSet(PENDING_STORAGE_KEY, JSON.stringify(all));
            alert("আপনার এন্ট্রিটি এডমিনের অনুমোদনের জন্য পাঠানো হয়েছে (ডেমো মোড)!");
            loadPendingFromLocal();
            if (typeof onSuccess === "function") onSuccess();
        }
    }
}

// লেনদেন মুছে ফেলা (শুধু মেইন এডমিন)
function deleteTransaction(id) {
    if (!isMainAdmin()) {
        alert("শুধুমাত্র মেইন এডমিন লেনদেন মুছতে পারবেন!");
        return;
    }
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
// রিকোয়েস্ট (pending_entries)
//   এডমিন/অনুমোদনকারী: নিজের প্রতিষ্ঠানের সব রিকোয়েস্ট
//   ইউজার: শুধু নিজের পাঠানোগুলো
// =============================================================
function initPendingListener(onUpdate) {
    pendingNotify = onUpdate;

    if (firestoreReady()) {
        db.collection("pending_entries").orderBy("createdAt", "desc")
            .onSnapshot(snapshot => {
                pendingEntries = [];
                const uid = getUserId();
                const approver = hasPermission("approveRequests");
                snapshot.forEach(doc => {
                    const d = { id: doc.id, ...doc.data() };
                    if (!orgMatch(d)) return;                       // 🏢 প্রতিষ্ঠান ফিল্টার
                    if (!approver && d.createdBy !== uid) return;   // ইউজার: শুধু নিজেরটা
                    pendingEntries.push(d);
                });
                if (typeof pendingNotify === "function") pendingNotify(pendingEntries);
            }, error => {
                console.error("Pending Listen Error:", error);
                loadPendingFromLocal();
            });
    } else {
        loadPendingFromLocal();
    }
}

function loadPendingFromLocal() {
    const data = storageGet(PENDING_STORAGE_KEY);
    let all = [];
    try { all = data ? JSON.parse(data) : []; } catch (e) { all = []; }

    if (!hasPermission("approveRequests")) {
        const uid = getUserId();
        all = all.filter(p => p.createdBy === uid);
    }
    pendingEntries = all;
    if (typeof pendingNotify === "function") pendingNotify(pendingEntries);
}

// ✅ রিকোয়েস্ট অনুমোদন — মূল লেনদেনে যুক্ত হয় + রেকর্ড APPROVED থেকে যায়
function approvePendingEntry(id) {
    if (!hasPermission("approveRequests")) {
        alert("এই কাজের অনুমতি আপনার নেই!");
        return;
    }
    const entry = pendingEntries.find(p => p.id === id);
    if (!entry) return;
    if (!confirm("এই রিকোয়েস্টটি অনুমোদন করতে চান? এটি মূল লেনদেন তালিকায় যুক্ত হয়ে যাবে।")) return;

    const clean = { ...entry };
    delete clean.id;
    delete clean.status;
    clean.approvedBy = getAdminName();
    clean.approvedAt = new Date().toISOString();

    if (firestoreReady()) {
        const batch = db.batch();
        batch.set(db.collection("transactions").doc(), clean);
        batch.update(db.collection("pending_entries").doc(id), {
            status: "APPROVED",
            approvedBy: getAdminName(),
            approvedAt: new Date().toISOString()
        });
        batch.commit()
            .then(() => alert("✅ অনুমোদন সম্পন্ন! লেনদেনটি মূল তালিকায় যুক্ত হয়েছে।"))
            .catch(err => alert("ত্রুটি: " + err.message));
    } else {
        clean.id = "local-" + Date.now();
        transactions.unshift(clean);
        storageSet(STORAGE_KEY, JSON.stringify(transactions));

        const all = JSON.parse(storageGet(PENDING_STORAGE_KEY) || "[]");
        const it = all.find(p => p.id === id);
        if (it) {
            it.status = "APPROVED";
            it.approvedBy = getAdminName();
            it.approvedAt = new Date().toISOString();
        }
        storageSet(PENDING_STORAGE_KEY, JSON.stringify(all));

        alert("✅ অনুমোদন সম্পন্ন (ডেমো মোড)!");
        notifyTx();
        loadPendingFromLocal();
    }
}

// ❌ রিকোয়েস্ট বাতিল — স্ট্যাটাস REJECTED
function rejectPendingEntry(id) {
    if (!hasPermission("approveRequests")) {
        alert("এই কাজের অনুমতি আপনার নেই!");
        return;
    }
    if (!confirm("এই রিকোয়েস্টটি বাতিল করতে চান?")) return;

    if (firestoreReady()) {
        db.collection("pending_entries").doc(id).update({
            status: "REJECTED",
            rejectedBy: getAdminName(),
            rejectedAt: new Date().toISOString()
        })
            .then(() => alert("রিকোয়েস্টটি বাতিল করা হয়েছে।"))
            .catch(err => alert("ত্রুটি: " + err.message));
    } else {
        const all = JSON.parse(storageGet(PENDING_STORAGE_KEY) || "[]");
        const it = all.find(p => p.id === id);
        if (it) {
            it.status = "REJECTED";
            it.rejectedBy = getAdminName();
            it.rejectedAt = new Date().toISOString();
        }
        storageSet(PENDING_STORAGE_KEY, JSON.stringify(all));
        alert("রিকোয়েস্টটি বাতিল করা হয়েছে (ডেমো মোড)।");
        loadPendingFromLocal();
    }
}

// =============================================================
// রিকোয়েস্ট টেবিল আঁকা (সব পেজে ব্যবহৃত)
// options: { type, statuses, withActions }
// =============================================================
function renderRequestsTable(tbodyId, options) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const opts = options || {};
    let list = pendingEntries || [];

    if (opts.type) {
        list = list.filter(p => p.type === opts.type);
    }
    if (opts.statuses && opts.statuses.length > 0) {
        list = list.filter(p => opts.statuses.includes(p.status || "PENDING"));
    }

    if (list.length === 0) {
        const colspan = opts.withActions ? 8 : 7;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center">কোনো রিকোয়েস্ট পাওয়া যায়নি</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(p => {
        const status = p.status || "PENDING";
        const statusBadge = `<span class="badge ${PENDING_STATUS_BADGE[status] || 'badge-pending'}">${PENDING_STATUS_LABEL[status] || status}</span>`;

        let actionHtml = "";
        if (opts.withActions && status === "PENDING") {
            actionHtml = `
                <div class="action-group">
                    <button class="btn btn-success btn-sm" onclick="approvePendingEntry('${escapeHtml(p.id)}')" title="অনুমোদন করুন">
                        <i class="fa-solid fa-check"></i> অনুমোদন
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="rejectPendingEntry('${escapeHtml(p.id)}')" title="বাতিল করুন">
                        <i class="fa-solid fa-xmark"></i> বাতিল
                    </button>
                </div>`;
        }

        return `
            <tr>
                <td>${escapeHtml(p.date) || '-'}</td>
                <td>
                    <span class="badge ${p.type === 'INCOME' ? 'badge-income' : 'badge-expense'}">
                        ${p.type === 'INCOME' ? 'জমা' : 'খরচ'}
                    </span>
                </td>
                <td><strong>${escapeHtml(p.name)}</strong><br><small class="text-muted">${escapeHtml(p.category)}</small></td>
                <td><strong>৳ ${Number(p.amount || 0).toLocaleString("bn-BD")}</strong></td>
                <td>${escapeHtml(p.adminName) || '-'}<br><small class="text-muted">${escapeHtml(p.creatorEmail) || ''}</small></td>
                <td>${escapeHtml(p.note) || '-'}</td>
                <td>${statusBadge}</td>
                ${opts.withActions ? `<td>${actionHtml || '<span class="text-muted">—</span>'}</td>` : ''}
            </tr>
        `;
    }).join("");
}

// =============================================================
// লোন রিকোয়েস্ট
//   এডমিন/লোন-ম্যানেজার: নিজের প্রতিষ্ঠানের সব লোন
//   ইউজার: শুধু নিজের লোন
// =============================================================
function initLoansListener(onUpdate) {
    loanNotify = onUpdate;

    if (firestoreReady()) {
        db.collection("loan_requests").orderBy("createdAt", "desc")
            .onSnapshot(snapshot => {
                loanRequests = [];
                const uid = getUserId();
                const manager = hasPermission("manageLoans");
                snapshot.forEach(doc => {
                    const d = { id: doc.id, ...doc.data() };
                    if (!orgMatch(d)) return;                      // 🏢 প্রতিষ্ঠান ফিল্টার
                    if (!manager && d.createdBy !== uid) return;   // ইউজার: শুধু নিজেরটা
                    loanRequests.push(d);
                });
                if (typeof loanNotify === "function") loanNotify(loanRequests);
            }, error => {
                console.error("Loan Listen Error:", error);
                loadLoansFromLocal();
            });
    } else {
        loadLoansFromLocal();
    }
}

function loadLoansFromLocal() {
    const data = storageGet(LOAN_STORAGE_KEY);
    let all = [];
    try { all = data ? JSON.parse(data) : []; } catch (e) { all = []; }

    if (!hasPermission("manageLoans")) {
        const uid = getUserId();
        all = all.filter(l => l.createdBy === uid);
    }
    loanRequests = all;
    if (typeof loanNotify === "function") loanNotify(loanRequests);
}

// লোন রিকোয়েস্ট পাঠানো (সবাই পারে — সবসময় অনুমোদন লাগে)
function submitLoanRequest(item, onSuccess) {
    item.status = "PENDING";
    item.requestedBy = getAdminName();
    item.createdBy = getUserId();
    item.creatorEmail = currentUser ? (currentUser.email || "") : "";
    item.createdAt = new Date().toISOString();
    item.orgId = currentOrgId || null;      // 🏢 প্রতিষ্ঠানের আইডি

    if (firestoreReady()) {
        db.collection("loan_requests").add(item)
            .then(() => {
                alert("লোন রিকোয়েস্ট এডমিনের কাছে পাঠানো হয়েছে!\nঅনুমোদন পেলে স্ট্যাটাস আপডেট হবে।");
                if (typeof onSuccess === "function") onSuccess();
            })
            .catch(err => alert("ত্রুটি: " + err.message));
    } else {
        const all = JSON.parse(storageGet(LOAN_STORAGE_KEY) || "[]");
        item.id = "local-" + Date.now();
        all.unshift(item);
        storageSet(LOAN_STORAGE_KEY, JSON.stringify(all));
        alert("লোন রিকোয়েস্ট পাঠানো হয়েছে (ডেমো মোড)!");
        loadLoansFromLocal();
        if (typeof onSuccess === "function") onSuccess();
    }
}

// লোনের স্ট্যাটাস বদলানো (এডমিন বা লোন-ম্যানেজার সাব এডমিন)
function updateLoanStatus(id, newStatus) {
    if (!hasPermission("manageLoans")) {
        alert("এই কাজের অনুমতি আপনার নেই!");
        return;
    }
    const labels = { "APPROVED": "অনুমোদিত (লোন প্রদান করা হলো)", "PAID": "পরিশোধিত" };
    if (!confirm("স্ট্যাটাস পরিবর্তন করতে চান: " + (labels[newStatus] || newStatus) + "?")) return;

    if (firestoreReady()) {
        const updateData = { status: newStatus };
        if (newStatus === "APPROVED") {
            updateData.approvedBy = getAdminName();
            updateData.approvedAt = new Date().toISOString();
        }
        db.collection("loan_requests").doc(id).update(updateData)
            .then(() => alert("স্ট্যাটাস হালনাগাদ হয়েছে: " + labels[newStatus]))
            .catch(err => alert("ত্রুটি: " + err.message));
    } else {
        const all = JSON.parse(storageGet(LOAN_STORAGE_KEY) || "[]");
        const it = all.find(l => l.id === id);
        if (it) {
            it.status = newStatus;
            if (newStatus === "APPROVED") it.approvedBy = getAdminName();
            storageSet(LOAN_STORAGE_KEY, JSON.stringify(all));
            alert("স্ট্যাটাস হালনাগাদ হয়েছে: " + labels[newStatus]);
            loadLoansFromLocal();
        }
    }
}

// লোন রিকোয়েস্ট মুছে ফেলা (এডমিন বা লোন-ম্যানেজার)
function deleteLoanRequest(id) {
    if (!hasPermission("manageLoans")) {
        alert("এই কাজের অনুমতি আপনার নেই!");
        return;
    }
    if (!confirm("আপনি কি নিশ্চিত যে এই লোন রিকোয়েস্টটি মুছে ফেলতে চান?")) return;

    if (firestoreReady()) {
        db.collection("loan_requests").doc(id).delete()
            .then(() => alert("লোন রিকোয়েস্ট মুছে ফেলা হয়েছে!"))
            .catch(err => alert("ত্রুটি: " + err.message));
    } else {
        const all = JSON.parse(storageGet(LOAN_STORAGE_KEY) || "[]");
        const remaining = all.filter(l => l.id !== id);
        storageSet(LOAN_STORAGE_KEY, JSON.stringify(remaining));
        alert("লোন রিকোয়েস্ট মুছে ফেলা হয়েছে (ডেমো মোড)!");
        loadLoansFromLocal();
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
// মেট্রিক্স হিসাব
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
// টেবিল রেন্ডারিং হেল্পার
// =============================================================
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

// লেজার পেজের বড় টেবিল
function renderLedgerTable(tbodyId, filterType) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    let filtered = transactions;
    if (filterType === "MY") {
        const uid = getUserId();
        filtered = transactions.filter(t => t.createdBy === uid);
    } else if (filterType && filterType !== "ALL") {
        filtered = transactions.filter(t => t.type === filterType);
    }

    if (!filtered || filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">কোনো তথ্য পাওয়া যায়নি</td></tr>`;
        return;
    }

    const isAdmin = isMainAdmin();

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
                ${isAdmin
                    ? `<button class="btn btn-outline-danger btn-sm" onclick="deleteTransaction('${escapeHtml(t.id)}')">
                         <i class="fa-solid fa-trash"></i>
                       </button>`
                    : `<span class="text-muted">—</span>`}
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
