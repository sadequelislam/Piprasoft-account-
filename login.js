// =============================================================
// লগইন / রেজিস্টার পেজ লজিক (index.html)
//
// ফিচার:
//  ১. ইমেইল + পাসওয়ার্ড দিয়ে নতুন একাউন্ট রেজিস্টার
//  ২. Google দিয়ে লগইন / রেজিস্টার
//  ৩. পাসওয়ার্ড রিসেট (ভুলে গেলে ইমেইলে লিংক)
//  ৪. 🌟 প্রতিষ্ঠান চেক: orgId থাকলে ড্যাশবোর্ডে,
//     না থাকলে founder.html (প্রতিষ্ঠান তৈরি/যোগ) পেজে
// =============================================================

const DEMO_USERS_KEY = "demo_registered_users";

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const tabBtnLogin = document.getElementById("tab-btn-login");
const tabBtnRegister = document.getElementById("tab-btn-register");
const authAlert = document.getElementById("auth-alert");
const btnGoogle = document.getElementById("btn-google");
const btnLogin = document.getElementById("btn-login");
const btnRegister = document.getElementById("btn-register");

const LOGIN_BTN_HTML = '<i class="fa-solid fa-right-to-bracket"></i> লগইন করুন';
const REGISTER_BTN_HTML = '<i class="fa-solid fa-user-plus"></i> একাউন্ট তৈরি করুন';
const GOOGLE_BTN_HTML = '<i class="fa-brands fa-google"></i> Google দিয়ে চালিয়ে যান';

function storageGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
}
function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}

function firebaseReady() {
    return typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized && auth;
}

// users কালেকশনে ইউজারের রেকর্ড সেভ/আপডেট (merge — orgId/role নষ্ট হয় না)
function upsertUserDoc(user) {
    if (typeof db === "undefined" || !db) return;
    db.collection("users").doc(user.uid).set({
        name: user.displayName || (user.email || "").split("@")[0] || "ইউজার",
        email: user.email || "",
        lastLoginAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});
}

document.addEventListener("DOMContentLoaded", () => {
    checkAlreadyLoggedIn();

    loginForm.addEventListener("submit", handleLogin);
    registerForm.addEventListener("submit", handleRegister);
    btnGoogle.addEventListener("click", handleGoogleLogin);
});

// =============================================================
// 🌟 ম্যাজিক লজিক: ইউজার চেক করে ড্যাশবোর্ড বা সেটআপ (founder) পেজে পাঠানো
// =============================================================
async function checkUserOrganizationAndRedirect(user) {
    if (!firebaseReady() || !db) {
        // ডেমো মোডে সরাসরি সেটআপ পেজে
        window.location.replace("dashboard/founder.html");
        return;
    }

    try {
        const userDocRef = db.collection("users").doc(user.uid);
        const userDoc = await userDocRef.get();

        if (userDoc.exists) {
            const userData = userDoc.data();

            // ইউজারের orgId থাকলে মূল ড্যাশবোর্ডে, না থাকলে সেটআপ পেজে
            if (userData.orgId) {
                window.location.replace("dashboard/");
            } else {
                window.location.replace("dashboard/founder.html");
            }
        } else {
            // প্রথমবার এলে (যেমন Google লগইনে) ডিফল্ট GUEST রেকর্ড তৈরি
            await userDocRef.set({
                name: user.displayName || (user.email || "").split("@")[0] || "ইউজার",
                email: user.email,
                role: "GUEST",
                orgId: null,
                createdAt: new Date().toISOString()
            });
            window.location.replace("dashboard/founder.html");
        }
    } catch (error) {
        console.error("Error checking user organization: ", error);
        showAlert("অ্যাকাউন্ট ভেরিফাই করতে সমস্যা হয়েছে। ইন্টারনেট কানেকশন চেক করুন।");
    }
}

// Already logged in?
function checkAlreadyLoggedIn() {
    if (firebaseReady()) {
        auth.onAuthStateChanged(user => {
            if (user) {
                checkUserOrganizationAndRedirect(user);
            }
        });
    } else {
        if (storageGet("demo_logged_user")) {
            window.location.replace("dashboard/founder.html");
        }
    }
}

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

// পাসওয়ার্ড দেখা / লুকানো
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

function showAlert(msg, type = "error") {
    authAlert.innerText = msg;
    authAlert.classList.remove("hidden", "alert-error", "alert-success");
    authAlert.classList.add(type === "success" ? "alert-success" : "alert-error");
}

function hideAlert() {
    authAlert.classList.add("hidden");
}

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
        setLoading(btnLogin, true, LOGIN_BTN_HTML);
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                upsertUserDoc(userCredential.user);
                // ডাইরেক্ট ড্যাশবোর্ডে না পাঠিয়ে প্রতিষ্ঠান চেক করে পাঠানো হয়
                checkUserOrganizationAndRedirect(userCredential.user);
            })
            .catch(error => {
                setLoading(btnLogin, false, LOGIN_BTN_HTML);
                showAlert("লগইন ব্যর্থ: " + translateFirebaseError(error.code));
            });
    } else {
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

        storageSet("demo_logged_user", JSON.stringify({ name: found.name, email: found.email }));
        window.location.href = "dashboard/founder.html";
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
        setLoading(btnRegister, true, REGISTER_BTN_HTML);
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                const user = userCredential.user;
                const profileUpdate = user.updateProfile({ displayName: name }).catch(() => {});

                // নতুন ইউজার ডিফল্টভাবে GUEST, orgId null
                const fsSave = (typeof db !== "undefined" && db)
                    ? db.collection("users").doc(user.uid).set({
                        name: name,
                        email: email,
                        role: "GUEST",
                        orgId: null,
                        createdAt: new Date().toISOString()
                    }).catch(() => {})
                    : Promise.resolve();

                return Promise.all([profileUpdate, fsSave]).then(() => user);
            })
            .then((user) => {
                showAlert("একাউন্ট সফলভাবে তৈরি হয়েছে! রিডাইরেক্ট করা হচ্ছে...", "success");
                setTimeout(() => {
                    checkUserOrganizationAndRedirect(user);
                }, 900);
            })
            .catch(error => {
                setLoading(btnRegister, false, REGISTER_BTN_HTML);
                showAlert("রেজিস্টার ব্যর্থ: " + translateFirebaseError(error.code));
            });
    } else {
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
        storageSet("demo_logged_user", JSON.stringify({ name: name, email: email }));
        showAlert("একাউন্ট সফলভাবে তৈরি হয়েছে! (ডেমো মোড)", "success");
        setTimeout(() => {
            window.location.href = "dashboard/founder.html";
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
        .then((result) => {
            upsertUserDoc(result.user);
            checkUserOrganizationAndRedirect(result.user);
        })
        .catch(error => {
            setLoading(btnGoogle, false, GOOGLE_BTN_HTML);
            if (error.code !== "auth/popup-closed-by-user") {
                showAlert("Google লগইন ব্যর্থ: " + translateFirebaseError(error.code));
            }
        });
}

// =============================================================
// ৪. পাসওয়ার্ড ভুলে গেছেন? → ইমেইলে রিসেট লিংক
// =============================================================
function handleForgotPassword() {
    hideAlert();

    const email = document.getElementById("login-email").value.trim();

    if (!email) {
        showAlert("আপনার ইমেইল ঠিকানা উপরের ঘরে লিখুন, তারপর আবার 'পাসওয়ার্ড ভুলে গেছেন?' চাপুন।");
        return;
    }

    if (!firebaseReady()) {
        showAlert("পাসওয়ার্ড রিসেট করতে Firebase সেটআপ থাকতে হবে।");
        return;
    }

    auth.sendPasswordResetEmail(email)
        .then(() => {
            showAlert("পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে! আপনার ইমেইল ইনবক্স (ও Spam ফোল্ডার) চেক করুন: " + email, "success");
        })
        .catch(error => {
            showAlert("ত্রুটি: " + translateFirebaseError(error.code));
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
        "auth/invalid-login-credentials": "ইমেইল বা পাসওয়ার্ড ভুল হয়েছে। প্রথমে রেজিস্টার করেছেন তো?",
        "auth/email-already-in-use": "এই ইমেইল দিয়ে ইতিমধ্যে একটি একাউন্ট আছে।",
        "auth/weak-password": "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।",
        "auth/too-many-requests": "অনেকবার চেষ্টা করার কারণে কিছুক্ষণ পর আবার চেষ্টা করুন।",
        "auth/network-request-failed": "ইন্টারনেট সংযোগ পাওয়া যায়নি।",
        "auth/operation-not-allowed": "এই লগইন পদ্ধতিটি Firebase Console-এ চালু (Enable) করা হয়নি।",
        "auth/popup-blocked": "ব্রাউজার পপআপ ব্লক করেছে। পপআপ অনুমতি দিন।",
        "auth/unauthorized-domain": "এই ডোমেইনটি Firebase-এ অনুমোদিত নয়।",
        "auth/user-disabled": "এই একাউন্টটি নিষ্ক্রিয় করা হয়েছে।",
        "auth/internal-error": "Firebase-এর ভেতরের সমস্যা। কিছুক্ষণ পর আবার চেষ্টা করুন।",
        "auth/account-exists-with-different-credential": "এই ইমেইল অন্য পদ্ধতিতে (পাসওয়ার্ড) ব্যবহৃত হচ্ছে। ইমেইল দিয়ে লগইন করুন।"
    };
    return messages[code] || ("অজানা ত্রুটি ঘটেছে (কোড: " + (code || "unknown") + ")");
}
