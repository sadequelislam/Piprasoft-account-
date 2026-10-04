# একাউন্টস ও লেজার ম্যানেজমেন্ট ওয়েবসাইট (Firebase Integrated)

এই প্রজেক্টটি একটি সম্পূর্ণ রেসপন্সিভ একাউন্টস ম্যানেজমেন্ট ওয়েব অ্যাপ্লিকেশন, যা ফায়ারবেস (Firebase Hosting, Authentication, Firestore Database) দিয়ে লাইভ করার জন্য তৈরি করা হয়েছে।

## 📁 ফাইল স্ট্রাকচার (প্রতিটা সেকশন আলাদা ফোল্ডারে):

```
website/
├── index.html            → 🔓 লগইন + রেজিস্টার পেজ (পাবলিক)
├── dashboard/
│   └── index.html        → ১. ড্যাশবোর্ড (মেট্রিক্স + পেন্ডিং রিকোয়েস্ট কার্ড)
├── fee-prodan/
│   └── index.html        → ২. ফি প্রদান (টাকা জমা ফর্ম)
├── cost/
│   └── index.html        → ৩. খরচ (ব্যয় ফর্ম)
├── loan-request/
│   └── index.html        → ৪. লোন রিকোয়েস্ট পাঠানো (ইউজার)
├── ledger/
│   └── index.html        → ৫. সকল লেনদেন (লেজার + CSV এক্সপোর্ট)
├── fee-request/
│   └── index.html        → ৬. ফি রিকোয়েস্ট ম্যানেজমেন্ট (এডমিন) 🆕
├── cost-request/
│   └── index.html        → ৭. খরচ রিকোয়েস্ট ম্যানেজমেন্ট (এডমিন) 🆕
├── loan-manage/
│   └── index.html        → ৮. লোন ম্যানেজমেন্ট — অনুমোদন/পরিশোধ (এডমিন) 🆕
├── sub-admin/
│   └── index.html        → ৯. সাব এডমিন সিলেক্ট — পারমিশন দেওয়া (মেইন এডমিন) 🆕
├── settings/
│   └── index.html        → ১০. সেটিং
├── js/
│   ├── common.js         → সাইডবার + লগইন গার্ড + রোল সিস্টেম (মেইন এডমিন/সাব এডমিন/ইউজার)
│   └── data.js           → ডাটা লেয়ার (লেনদেন, রিকোয়েস্ট, লোন, পারমিশন)
├── login.js              → লগইন + রেজিস্টার + Google সাইন-ইন লজিক
├── firebase-config.js    → ফায়ারবেস কনফিগারেশন (API Key ইত্যাদি)
├── style.css             → পুরো ওয়েবসাইটের ডিজাইন
└── firebase.json         → ফায়ারবেস হোস্টিং কনফিগ
```

**রোল সিস্টেম:** মেইন এডমিন (নির্দিষ্ট ইমেইল) → সব কিছুর কন্ট্রোল। সাব এডমিন (মেইন এডমিন পারমিশন দেন) → নির্দিষ্ট কাজ। ইউজার → দেখা + রিকোয়েস্ট পাঠানো। এডমিন-পেজগুলো শুধু অনুমতি থাকলেই মেনুতে দেখায়।

**🏢 প্রতিষ্ঠান (Organization) সিস্টেম:**
- নতুন ইউজার রেজিস্টার করলে প্রথমে `dashboard/founder.html` (সেটআপ পেজ)-এ যায়
- সেখানে দুইটা অপশন: **নতুন প্রতিষ্ঠান তৈরি করা** (ফাউন্ডার হবে + Join Code পাবে) অথবা **Join Code দিয়ে কোনো প্রতিষ্ঠানে যোগ দেওয়া**
- ফাউন্ডার তার Join Code **সেটিং পেজে** দেখতে পাবেন — কোড দিয়ে সহকর্মীরা যোগ দেবে
- প্রতিটি লেনদেন/রিকোয়েস্ট/লোন প্রতিষ্ঠান-ভিত্তিক — ইউজার শুধু নিজের প্রতিষ্ঠানের ডাটা দেখেন (মেইন এডমিন সব দেখেন)

**URL আকারে (লাইভ থাকলে):** `your-project.web.app/dashboard/`, `your-project.web.app/loan-request/` ইত্যাদি — প্রতিটা সেকশনের নিজস্ব লিংক!

## 🆕 লোন রিকোয়েস্ট পেজ:

- নতুন লোন রিকোয়েস্ট জমা দেওয়ার ফর্ম (গ্রহীতার নাম, পরিমাণ, তারিখ, বিবরণ)
- সব রিকোয়েস্টের তালিকা + স্ট্যাটাস ফিল্টার
- স্ট্যাটাস ফ্লো: **অপেক্ষমান → অনুমোদিত → পরিশোধিত** (বাটন দিয়ে হালনাগাদ)
- ডাটা Firebase-এ `loan_requests` কালেকশনে জমা হয় (ডেমো মোডে localStorage)

## 🔒 প্রোটেকশন (নিরাপত্তা) কিভাবে কাজ করে:

১. **লগইন ছাড়া ঢুকতে চাইলে:** ৬টা পেজের *যেকোনো* একটা সরাসরি খুললেই লগইন যাচাই হবে (`js/common.js` গার্ড) — লগইন না থাকলে **automatically লগইন পেজে ফেরত** পাঠানো হবে।

২. **লগআউট করলে:** সাথে সাথে লগইন পেজে ফিরে যাবে, ব্রাউজারের ব্যাক বাটন চাপলেও ঢুকা যাবে না।

৩. **সাইডবার এক জায়গা থেকে কন্ট্রোল:** নতুন মেনু যোগ/বদল করতে শুধু `js/common.js`-এর `APP_PAGES` আর `PAGE_ORDER` বদলান — সব পেজে অটো আপডেট হবে।

> ⚠️ **গুরুত্বপূর্ণ নোট:** ডাটার সম্পূর্ণ নিরাপত্তার জন্য Firebase ব্যবহার করুন এবং নিচের **Firestore Security Rules** সেট করুন (ধাপ ১ দেখুন)। ডেমো মোডে (Firebase ছাড়া) সব ডাটা শুধু ব্রাউজারের localStorage-এ থাকে, তাই ওই মোড শুধু টেস্টের জন্য।

## 🌟 ফিচারসমূহ:

১. **লগইন ও রেজিস্টার পেজ**: নতুন এডমিন সরাসরি ওয়েবসাইট থেকে রেজিস্টার করতে পারবে — **ইমেইল/পাসওয়ার্ড** অথবা **Google** দিয়ে। রেজিস্টার করা ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করলে প্রোটেক্টেড ড্যাশবোর্ডে নিয়ে যাবে। সব একাউন্টের তথ্য **Firebase Authentication**-এ নিরাপদে জমা থাকে।
২. **লেফট সাইডবার নেভিগেশন (৬টি পেজ)**:
   - **১. ড্যাশবোর্ড (হোম)**: মোট জমা, মোট খরচ এবং বর্তমান ক্যাশ ব্যালেন্স রিয়েল-টাইমে হিসাব করে দেখায়।
   - **২. ফি প্রদান (জমা)**: গ্রাহক/সদস্যের ফি বা টাকা জমা এন্ট্রি করার ফর্ম।
   - **৩. খরচ (ব্যয়)**: বিভিন্ন খরচের খাত ও ভাউচারসহ ব্যয় এন্ট্রি করার ফর্ম।
   - **৪. লোন রিকোয়েস্ট** 🆕: লোন রিকোয়েস্ট জমা, অনুমোদন ও পরিশোধ ট্র্যাকিং।
   - **৫. সকল লেনদেন**: সব এডমিনদের যুক্ত করা আয় ও ব্যয়ের রিয়েল-টাইম লেজার (ফিল্টার + CSV ডাউনলোড)।
   - **৬. সেটিং**: ফায়ারবেস কনফিগারেশন, এডমিন নাম, ডার্ক মোড (সেভ হয়), ডেমো ডাটা রিসেট।

---

## 🚀 ফায়ারবেসে (Firebase) লাইভ ফ্রি URL তৈরি ও ডেপ্লয় করার ধাপসমূহ:

### ধাপ ১: ফায়ারবেস প্রজেক্ট তৈরি ও নিরাপত্তা রুলস
১. [console.firebase.google.com](https://console.firebase.google.com/)-এ যান।
২. **Add project** এ ক্লিক করে একটি নতুন প্রজেক্ট তৈরি করুন (যেমন: `my-ledger-app`)।
৩. **Authentication** সেকশনে যান → **Sign-in method** → **Email/Password** এবং **Google** — দুটোই **Enable** করে দিন (এতে ইউজাররা নিজেরাই ইমেইল দিয়ে রেজিস্টার করতে পারবে এবং Google দিয়ে লগইন করতে পারবে)।
৪. **Firestore Database** সেকশনে গিয়ে **Create database** দিন (Start in test mode)।
৫. **Firestore Database → Rules** ট্যাবে গিয়ে নিচের রুলস বসিয়ে **Publish** করুন — এতে লগইন করা ছাড়া কেউ ডাটাবেস থেকে তথ্য পড়তে/লিখতে পারবে না:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isMainAdmin() {
      return request.auth != null && request.auth.token.email == "sadequelislam93@gmail.com";
    }
    function isSubAdminWith(perm) {
      return request.auth != null
        && exists(/databases/$(database)/documents/sub_admins/$(request.auth.uid))
        && get(/databases/$(database)/documents/sub_admins/$(request.auth.uid)).data.permissions[perm] == true;
    }
    match /transactions/{docId} {
      allow read: if request.auth != null;
      allow create: if isMainAdmin() || isSubAdminWith('addIncome') || isSubAdminWith('addExpense');
      allow update, delete: if isMainAdmin();
    }
    match /loan_requests/{docId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if isMainAdmin() || isSubAdminWith('manageLoans');
    }
    match /pending_entries/{docId} {
      allow read: if isMainAdmin() || isSubAdminWith('approveRequests')
        || (request.auth != null && resource.data.createdBy == request.auth.uid);
      allow create: if request.auth != null;
      allow update: if isMainAdmin() || isSubAdminWith('approveRequests');
      allow delete: if isMainAdmin();
    }
    match /sub_admins/{uid} {
      allow read: if request.auth != null;
      allow write: if isMainAdmin();
    }
    match /organizations/{orgId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if isMainAdmin();
    }
    match /users/{userId} {
      allow read: if isMainAdmin() || (request.auth != null && request.auth.uid == userId);
      allow write: if (request.auth != null && request.auth.uid == userId) || isMainAdmin();
    }
  }
}
```

> ⚠️ **গুরুত্বপূর্ণ:** এই রুলসে `sadequelislam93@gmail.com` হলো মেইন এডমিনের ইমেইল। এডমিন বদলালে `js/common.js`-এর `MAIN_ADMIN_EMAIL` **এবং** এই রুলসের ইমেইল — দুই জায়গাতেই বদলাতে হবে।

৬. Google সাইন-ইন শুধু অনুমোদিত (authorized) ডোমেইনে কাজ করে — `localhost` এবং আপনার `*.web.app` ডোমেইন ডিফল্টভাবেই অনুমোদিত থাকে, তাই আলাদা কিছু করা লাগবে না।

### ধাপ ২: ওয়েব অ্যাপ যুক্ত করা ও API Key নেওয়া
১. Project Overview এর পাশে **Web (</>)** আইকনে ক্লিক করে একটি ওয়েব অ্যাপ তৈরি করুন।
২. আপনার প্রজেক্টের **Firebase Configuration Code** (`apiKey`, `authDomain`, `projectId` ইত্যাদি) পাবেন।
৩. সেটা `firebase-config.js` ফাইলে সরাসরি বসিয়ে দিন। **অথবা** ওয়েবসাইটে লগইন করে **৬. সেটিং** পেজ থেকেও বসানো যাবে।

### ধাপ ৩: বিনামূল্যে লাইভ ওয়েবসাইট URL তৈরি (Firebase Hosting Deploy)
আপনার কম্পিউটারে VS Code বা টার্মিনাল ওপেন করুন এবং এই প্রজেক্ট ফোল্ডারে গিয়ে নিচের কমান্ডগুলো চালান:

```bash
# ১. Firebase CLI ইনস্টল করুন (যদি আগে না করা থাকে)
npm install -g firebase-tools

# ২. আপনার গুগল একাউন্টে লগইন করুন
firebase login

# ৩. প্রজেক্ট ফায়ারবেসে ইনিশিয়ালাইজ করুন
firebase init hosting
# - 'Use an existing project' সিলেক্ট করে আপনার তৈরি করা প্রজেক্টটি সিলেক্ট করুন।
# - Public directory হিসেবে ' . ' (ডট) দিন।
# - Configure as a single-page app? -> No (n)   ⚠️ (এটি মাল্টি-পেজ অ্যাপ)
# - Set up automatic builds? -> No (n)

# ৪. প্রজেক্ট ফায়ারবেসে ফ্রিতে লাইভ ডেপ্লয় করুন
firebase deploy
```

ডেপ্লয় শেষে আপনি একটি ফ্রি **`.web.app`** লিংক পাবেন:

- 🔗 `https://your-project.web.app/` → লগইন / রেজিস্টার পেজ
- 🔗 `https://your-project.web.app/dashboard/` → ড্যাশবোর্ড (প্রোটেক্টেড)
- 🔗 `https://your-project.web.app/loan-request/` → লোন রিকোয়েস্ট (প্রোটেক্টেড)
- ... বাকি সব পেজও একইভাবে তাদের ফোল্ডারের নামে

## 🛠️ নতুন পেজ যোগ করবেন কীভাবে?

১. নতুন একটা ফোল্ডার বানান (যেমন: `reports/`) আর ভেতরে `index.html` তৈরি করুন — যেকোনো বিদ্যমান পেজ কপি করে শুধু `data-page` আর কন্টেন্ট বদলান।
২. `js/common.js` ফাইলে `APP_PAGES`-এ নতুন এন্ট্রি যোগ করুন আর `PAGE_ORDER`-এ ফোল্ডারের নাম বসান।
৩. ব্যাস! সব পেজের সাইডবারে নতুন মেনুটি চলে আসবে।

## 💻 লোকালি (নিজের কম্পিউটারে) টেস্ট করার জন্য:

```bash
# website ফোল্ডারে গিয়ে একটি সিম্পল সার্ভার চালান
python -m http.server 8000
# তারপর ব্রাউজারে যান: http://localhost:8000
```

> নোট: ফাইলগুলো সরাসরি ডাবল-ক্লিক করে খুললেও ডেমো মোডে বেশিরভাগ কাজ করবে, তবে সার্ভার দিয়ে খুললে সবচেয়ে ভালো ফল পাবেন।
