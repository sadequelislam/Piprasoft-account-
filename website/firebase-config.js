// =============================================================
// firebase-config.js — ফায়ারবেস কনফিগারেশন (PipraSoft Hisab Nikas)
// =============================================================
// এই মানগুলো Firebase Console থেকে নেওয়া:
// Project Settings → General → Your apps → SDK setup and configuration → Config

// আপনার আসল Firebase কনফিগ
let firebaseConfig = {
    apiKey: "AIzaSyAF_j0yuRYc7ko8RgzKdRcIc8pGFVE42Lc",
    authDomain: "piprasoft-hisab-nikas.firebaseapp.com",
    projectId: "piprasoft-hisab-nikas",
    storageBucket: "piprasoft-hisab-nikas.firebasestorage.app",
    messagingSenderId: "8858443395",
    appId: "1:8858443395:web:eefc200425469728bd05b6",
    measurementId: "G-97G02N5CKH"
};

// সেটিং পেজ থেকে নতুন কনফিগ সেভ করা থাকলে সেটাই ব্যবহার হবে
// (শুধু তখনই, যখন সেভ করা কনফিগে apiKey ও projectId দুটোই আছে)
try {
    const savedConfig = localStorage.getItem('user_firebase_config');
    if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed && parsed.apiKey && parsed.projectId) {
            firebaseConfig = parsed;
        }
    }
} catch (e) {
    console.warn("localStorage থেকে কনফিগ পড়া যায়নি।", e);
}

// Firebase Initialize
let isFirebaseInitialized = false;
let db = null;
let auth = null;

function initFirebase() {
    // Firebase SDK লোড হয়নি এমন পরিবেশে ক্র্যাশ থেকে বাঁচতে চেক
    if (typeof firebase === "undefined") {
        console.warn("Firebase SDK লোড হয়নি। ডেমো / LocalStorage মোডে চলছে।");
        isFirebaseInitialized = false;
        return;
    }

    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            auth = firebase.auth();
            isFirebaseInitialized = true;
            console.log("Firebase Successfully Initialized!");
        } catch (error) {
            console.error("Firebase Initialization Error:", error);
            isFirebaseInitialized = false;
        }
    } else {
        console.warn("Firebase config not set yet. Running in Demo / LocalStorage Mode.");
        isFirebaseInitialized = false;
    }
}

initFirebase();