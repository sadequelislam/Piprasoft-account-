// Initial Demo Data if storage is empty
const initialDemoData = [
    {
        id: "trx-101",
        type: "income",
        payerOrCategory: "মেসার্স আল-মদিনা ট্রেডার্স",
        amount: 25000,
        trxId: "BK8N912X45",
        purpose: "পণ্য বিক্রয়ের অগ্রিম বিল",
        admin: "Admin 1 (রফিক)",
        date: "08/09/2026, 10:30 AM",
        image: null
    },
    {
        id: "trx-102",
        type: "expense",
        payerOrCategory: "অফিস নাস্তা ও আপ্যায়ন",
        amount: 1250,
        trxId: "-",
        purpose: "গেস্ট আপ্যায়ন ও বিস্কুট মিষ্টান্ন ক্রয়",
        admin: "Admin 2 (শফিক)",
        date: "08/09/2026, 11:15 AM",
        image: null
    },
    {
        id: "trx-103",
        type: "expense",
        payerOrCategory: "ইন্টারনেট বিল",
        amount: 3500,
        trxId: "BK7M22910P",
        purpose: "সেপ্টেম্বর মাসের ব্রডব্যান্ড লাইন খরচ",
        admin: "Admin 5 (সাদিক)",
        date: "08/09/2026, 02:00 PM",
        image: null
    }
];

// Load transactions from localStorage or fallback to demo
let transactions = JSON.parse(localStorage.getItem('company_ledger_data')) || initialDemoData;

// Save to localStorage & refresh table
function saveData() {
    localStorage.setItem('company_ledger_data', JSON.stringify(transactions));
    renderData();
}

// Get current formatted Date & Time in Bengali
function formatDate() {
    const now = new Date();
    return now.toLocaleDateString('bn-BD') + ', ' + now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
}

// Render Table & Summary Cards
function renderData() {
    const tableBody = document.getElementById('transactionTable');
    const filterType = document.getElementById('filterType').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();

    tableBody.innerHTML = '';

    let totalInc = 0;
    let totalExp = 0;

    // Calculate totals over all data
    transactions.forEach(item => {
        if (item.type === 'income') totalInc += Number(item.amount);
        if (item.type === 'expense') totalExp += Number(item.amount);
    });

    // Filter data for table display
    let filteredList = transactions.slice().reverse().filter(item => {
        const matchesType = filterType === 'all' || item.type === filterType;
        const matchesSearch = item.purpose.toLowerCase().includes(searchQuery) ||
                              item.payerOrCategory.toLowerCase().includes(searchQuery) ||
                              item.admin.toLowerCase().includes(searchQuery) ||
                              (item.trxId && item.trxId.toLowerCase().includes(searchQuery));
        return matchesType && matchesSearch;
    });

    if (filteredList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-10 text-slate-400 font-medium">
                    <i class="fa-solid fa-folder-open text-3xl mb-2 block text-slate-300"></i>
                    কোনো তথ্য খুঁজে পাওয়া যায়নি।
                </td>
            </tr>`;
    } else {
        filteredList.forEach((item) => {
            const row = document.createElement('tr');
            row.className = "hover:bg-slate-50/80 transition";
            row.innerHTML = `
                <td class="p-4 text-xs font-medium text-slate-500 whitespace-nowrap">${item.date}</td>
                <td class="p-4 whitespace-nowrap">
                    <span class="px-2.5 py-1 text-xs font-bold rounded-full ${item.type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                        ${item.type === 'income' ? '<i class="fa-solid fa-arrow-down me-1"></i>জমা' : '<i class="fa-solid fa-arrow-up me-1"></i>ব্যয়'}
                    </span>
                </td>
                <td class="p-4">
                    <div class="font-bold text-slate-800">${item.purpose}</div>
                    <div class="text-xs text-slate-400 font-medium">${item.payerOrCategory || '-'}</div>
                </td>
                <td class="p-4 font-extrabold whitespace-nowrap ${item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}">
                    ${item.type === 'income' ? '+' : '-'} ৳${Number(item.amount).toLocaleString('bn-BD')}
                </td>
                <td class="p-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                    <span class="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        <i class="fa-regular fa-user me-1 text-slate-400"></i>${item.admin}
                    </span>
                </td>
                <td class="p-4 text-xs font-mono font-bold text-slate-500 whitespace-nowrap">${item.trxId || '-'}</td>
                <td class="p-4 whitespace-nowrap">
                    ${item.image 
                        ? `<button onclick="viewImage('${item.image}')" class="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1"><i class="fa-solid fa-image"></i> দেখুন</button>` 
                        : '<span class="text-slate-300 text-xs font-medium">নাই</span>'}
                </td>
                <td class="p-4 text-center whitespace-nowrap">
                    <button onclick="deleteItem('${item.id}')" title="মুছে ফেলুন" class="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Update Top Summary Cards
    document.getElementById('totalIncome').innerText = '৳ ' + totalInc.toLocaleString('bn-BD');
    document.getElementById('totalExpense').innerText = '৳ ' + totalExp.toLocaleString('bn-BD');
    
    const balance = totalInc - totalExp;
    const balanceEl = document.getElementById('currentBalance');
    balanceEl.innerText = '৳ ' + balance.toLocaleString('bn-BD');
    
    if (balance < 0) {
        balanceEl.className = "text-3xl font-extrabold text-rose-600 mt-2";
    } else {
        balanceEl.className = "text-3xl font-extrabold text-indigo-700 mt-2";
    }
}

// Add Income Form Submission
document.getElementById('incomeForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const currentAdmin = document.getElementById('currentAdmin').value;
    const payer = document.getElementById('incPayer').value.trim();
    const amount = document.getElementById('incAmount').value;
    const trxId = document.getElementById('incTrx').value.trim() || '-';
    const purpose = document.getElementById('incPurpose').value.trim();

    transactions.push({
        id: 'trx-' + Date.now(),
        type: 'income',
        payerOrCategory: payer,
        amount: Number(amount),
        trxId: trxId,
        purpose: purpose,
        admin: currentAdmin,
        date: formatDate(),
        image: null
    });

    saveData();
    this.reset();
});

// Add Expense Form Submission
document.getElementById('expenseForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const currentAdmin = document.getElementById('currentAdmin').value;
    const amount = document.getElementById('expAmount').value;
    const category = document.getElementById('expCategory').value.trim();
    const purpose = document.getElementById('expPurpose').value.trim();
    const imageInput = document.getElementById('expImage');

    const handleExpenseAddition = (imageData = null) => {
        transactions.push({
            id: 'trx-' + Date.now(),
            type: 'expense',
            payerOrCategory: category,
            amount: Number(amount),
            trxId: '-',
            purpose: purpose,
            admin: currentAdmin,
            date: formatDate(),
            image: imageData
        });
        saveData();
        this.reset();
    };

    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            handleExpenseAddition(evt.target.result);
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        handleExpenseAddition(null);
    }
});

// Delete Single Entry
function deleteItem(id) {
    if (confirm('আপনি কি এই এন্ট্রিটি সত্যি মুছে ফেলতে চান?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
    }
}

// Copy bKash Number
function copyBkash() {
    const num = document.getElementById('bkashNum').innerText;
    navigator.clipboard.writeText(num);
    alert('bKash নাম্বার কপি করা হয়েছে: ' + num);
}

// Modal Functions for Voucher Image View
function viewImage(src) {
    document.getElementById('modalImg').src = src;
    const modal = document.getElementById('imageModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Reset All Data
function clearAllData() {
    if (confirm('আপনি কি নিশ্চিত যে সমস্ত লেনদেনের হিস্ট্রি মুছে রিসেট করবেন?')) {
        transactions = [];
        saveData();
    }
}

// Export Table Data to CSV File
function exportToCSV() {
    if (transactions.length === 0) {
        alert('এক্সপোর্ট করার মতো কোনো ডাটা নেই!');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,﻿";
    csvContent += "তারিখ,টাইপ,বিবরণ,উৎস/খাত,পরিমাণ,অ্যাডমিন,bKash TrxID
";

    transactions.forEach(t => {
        let row = [
            `"${t.date}"`,
            `"${t.type === 'income' ? 'জমা' : 'ব্যয়'}"`,
            `"${t.purpose}"`,
            `"${t.payerOrCategory}"`,
            `"${t.amount}"`,
            `"${t.admin}"`,
            `"${t.trxId || '-'}"`
        ];
        csvContent += row.join(",") + "
";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `company_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initial Run
renderData();
