// =============================================================
// লগইন / রেজিস্টার পেজ লজিক (index.html)
//
// ফিচার:
//  ১. ইমেইল + পাসওয়ার্ড দিয়ে নতুন একাউন্ট রেজিস্টার
//  ২. Google দিয়ে লগইন / রেজিস্টার (Firebase থাকলে)
//  ৩. রেজিস্টার করা ইমেইল ও পাসওয়ার্ড দিয়ে লগইন
//  ৪. সব একাউন্ট Firebase Authentication-এ জমা হয়
//  ৫. সফল হলে প্রোটেক্টেড dashboard/ পেজে পাঠিয়ে দেয়
// =============================================================

// Demo Mode: রেজিস্টার করা ইউজারদের লিস্ট (localStorage)
const DEMO_USERS_KEY = "demo_registered_users";

// DOM Elements
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const tabBtnLogin = document.getElementById("tab-btn-login");
const tabBtnRegister = document.getElementById("tab-btn-register");
const authAlert = document.getElementById("auth-alert");
const btnGoogle = document.getElementById("btn-google");
const btnLogin = document.getElementById("btn-login");
const btnRegister = document.getElementById("btn-register");

// বাটনের আসল লেখা (লোডিং শেষে ফিরিয়ে আনার জন্য)
const LOGIN_BTN_HTML = '<i class="fa-solid fa-right-to-bracket"></i> লগইন করুন';
const REGISTER_BTN_HTML = '<i class="fa-solid fa-user-plus"></i> একাউন্ট তৈরি করুন';
const GOOGLE_BTN_HTML = '<i class="fa-brands fa-google"></i> Google দিয়ে চালিয়ে যান';

// Safe localStorage helpers (ব্রাউজার ব্লক করলেও ক্র্যাশ করবে না)
function storageGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
}
function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}

// Firebase প্রস্তুত কিনা
function firebaseReady() {
    return typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized && auth;
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    // ইতিমধ্যে লগইন করা থাকলে সরাসরি ড্যাশবোর্ডে পাঠিয়ে দিন
    checkAlreadyLoggedIn();

    // Form Handlers
    loginForm.addEventListener("submit", handleLogin);
    registerForm.addEventListener("submit", handleRegister);
    btnGoogle.addEventListener("click", handleGoogleLogin);
});

// Already logged in? -> redirect to protected dashboard
function checkAlreadyLoggedIn() {
    if (firebaseReady()) {
        auth.onAuthStateChanged(user => {
            if (user) {
                window.location.replace("dashboard/");
            }
        });
    } else {
        if (storageGet("demo_logged_user")) {
            window.location.replace("dashboard/");
        }
    }
}

// =============================================================
// ট্যাব সুইচিং (লগইন <-> রেজিস্টার)
// =============================================================
function switchAuthTab(tab) {
    hideAlert();

    if (tab === "login") {
        tabBtnLogin.classList.add("active");
        tabBtnRegister.classList.remove("active");
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
    } else {
        tabBtnRegister.classList.add("active");
        tabBtnLogin.classList.remove("active");
        registerForm.classList.remove("hidden");
        loginForm.classList.add("hidden");
    }
}

// =============================================================
// পাসওয়ার্ড দেখা / লুকানো (চোখের আইকন)
// =============================================================
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector("i");
    if (input.type === "password") {
        input.type = "text";
        icon.className = "fa-solid fa-eye-slash";
    } else {
        input.type = "password";
        icon.className = "fa-solid fa-eye";
    }
}

// =============================================================
// এলার্ট (এরর / সফল বার্তা)
// =============================================================
function showAlert(msg, type = "error") {
    authAlert.innerText = msg;
    authAlert.classList.remove("hidden", "alert-error", "alert-success");
    authAlert.classList.add(type === "success" ? "alert-success" : "alert-error");
}

function hideAlert() {
    authAlert.classList.add("hidden");
}

// বাটন ব্যস্ত অবস্থায় দেখান
function setLoading(btn, isLoading, normalHTML) {
    btn.disabled = isLoading;
    btn.innerHTML = isLoading
        ? '<i class="fa-solid fa-spinner fa-spin"></i> অপেক্ষা করুন...'
        : normalHTML;
}

// =============================================================
// ১. লগইন হ্যান্ডলার
// =============================================================
function handleLogin(e) {
    e.preventDefault();
    hideAlert();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (firebaseReady()) {
        // ---- Firebase মোড: আসল লগইন ----
        setLoading(btnLogin, true, LOGIN_BTN_HTML);
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                window.location.href = "dashboard/";
            })
            .catch(error => {
                setLoading(btnLogin, false, LOGIN_BTN_HTML);
                showAlert("লগইন ব্যর্থ: " + translateFirebaseError(error.code));
            });
    } else {
        // ---- ডেমো মোড: রেজিস্টার করা ইউজার চেক ----
        const users = JSON.parse(storageGet(DEMO_USERS_KEY) || "[]");
        const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!found) {
            showAlert("এই ইমেইল দিয়ে কোনো একাউন্ট নেই। আগে রেজিস্টার করুন।");
            switchAuthTab("register");
            document.getElementById("reg-email").value = email;
            return;
        }
        if (found.password !== password) {
            showAlert("পাসওয়ার্ডটি ভুল হয়েছে।");
            return;
        }

        // সফল লগইন -> ড্যাশবোর্ডে
        storageSet("demo_logged_user", JSON.stringify({ name: found.name, email: found.email }));
        window.location.href = "dashboard/";
    }
}

// =============================================================
// ২. রেজিস্টার (নতুন একাউন্ট) হ্যান্ডলার
// =============================================================
function handleRegister(e) {
    e.preventDefault();
    hideAlert();

    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const confirmPassword = document.getElementById("reg-confirm").value;

    // ভ্যালিডেশন
    if (name.length < 2) {
        showAlert("অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন।");
        return;
    }
    if (password.length < 6) {
        showAlert("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
        return;
    }
    if (password !== confirmPassword) {
        showAlert("দুটি পাসওয়ার্ড এক হয়নি। আবার চেক করুন।");
        return;
    }

    if (firebaseReady()) {
        // ---- Firebase মোড: আসল একাউন্ট তৈরি ----
        setLoading(btnRegister, true, REGISTER_BTN_HTML);
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                const user = userCredential.user;

                // প্রোফাইলে নাম সেভ
                const profileUpdate = user.updateProfile({ displayName: name }).catch(() => {});

                // Firestore "users" কালেকশনে ইউজারের রেকর্ড সেভ
                const fsSave = (typeof db !== "undefined" && db)
                    ? db.collection("users").doc(user.uid).set({
                        name: name,
                        email: email,
                        createdAt: new Date().toISOString()
                      }).catch(() => {})
                    : Promise.resolve();

                return Promise.all([profileUpdate, fsSave]);
            })
            .then(() => {
                showAlert("একাউন্ট সফলভাবে তৈরি হয়েছে! ড্যাশবোর্ডে যাচ্ছেন...", "success");
                setTimeout(() => {
                    window.location.href = "dashboard/";
                }, 900);
            })
            .catch(error => {
                setLoading(btnRegister, false, REGISTER_BTN_HTML);
                showAlert("রেজিস্টার ব্যর্থ: " + translateFirebaseError(error.code));
            });
    } else {
        // ---- ডেমো মোড: লোকালি সেভ ----
        const users = JSON.parse(storageGet(DEMO_USERS_KEY) || "[]");

        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            showAlert("এই ইমেইল দিয়ে ইতিমধ্যে একটি একাউন্ট আছে। লগইন করুন।");
            switchAuthTab("login");
            return;
        }

        users.push({
            name: name,
            email: email,
            password: password,
            createdAt: new Date().toISOString()
        });
        storageSet(DEMO_USERS_KEY, JSON.stringify(users));

        // সরাসরি লগইন করিয়ে ড্যাশবোর্ডে পাঠানো হলো
        storageSet("demo_logged_user", JSON.stringify({ name: name, email: email }));
        showAlert("একাউন্ট সফলভাবে তৈরি হয়েছে! (ডেমো মোড)", "success");
        setTimeout(() => {
            window.location.href = "dashboard/";
        }, 900);
    }
}

// =============================================================
// ৩. Google দিয়ে লগইন / রেজিস্টার
// =============================================================
function handleGoogleLogin() {
    hideAlert();

    if (!firebaseReady()) {
        showAlert("Google লগইন ব্যবহার করতে প্রথমে Firebase কনফিগারেশন সেট করতে হবে (firebase-config.js)।");
        return;
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    setLoading(btnGoogle, true, GOOGLE_BTN_HTML);

    auth.signInWithPopup(provider)
        .then(() => {
            window.location.href = "dashboard/";
        })
        .catch(error => {
            setLoading(btnGoogle, false, GOOGLE_BTN_HTML);
            // ইউজার নিজে পপআপ বন্ধ করলে এরর দেখানোর দরকার নেই
            if (error.code !== "auth/popup-closed-by-user") {
                showAlert("Google লগইন ব্যর্থ: " + translateFirebaseError(error.code));
            }
        });
}

// =============================================================
// সহজ বাংলায় কমন ফায়ারবেস এরর বার্তা
// =============================================================
function translateFirebaseError(code) {
    const messages = {
        "auth/invalid-email": "ইমেইল ঠিকানাটি সঠিক নয়।",
        "auth/user-not-found": "এই ইমেইল দিয়ে কোনো একাউন্ট পাওয়া যায়নি।",
        "auth/wrong-password": "পাসওয়ার্ডটি ভুল হয়েছে।",
        "auth/invalid-credential": "ইমেইল বা পাসওয়ার্ড ভুল হয়েছে।",
        "auth/email-already-in-use": "এই ইমেইল দিয়ে ইতিমধ্যে একটি একাউন্ট আছে।",
        "auth/weak-password": "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।",
        "auth/too-many-requests": "অনেকবার চেষ্টা করার কারণে কিছুক্ষণ পর আবার চেষ্টা করুন।",
        "auth/network-request-failed": "ইন্টারনেট সংযোগ পাওয়া যায়নি।",
        "auth/operation-not-allowed": "এই লগইন পদ্ধতিটি Firebase Console-এ চালু (Enable) করা হয়নি।",
        "auth/popup-blocked": "ব্রাউজার পপআপ ব্লক করেছে। পপআপ অনুমতি দিন।",
        "auth/account-exists-with-different-credential": "এই ইমেইল অন্য পদ্ধতিতে (পাসওয়ার্ড) ব্যবহৃত হচ্ছে। ইমেইল দিয়ে লগইন করুন।"
    };
    return messages[code] || "অজানা ত্রুটি ঘটেছে, আবার চেষ্টা করুন।";
}
