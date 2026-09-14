// Firebase Config Object
// এই ফাইলে আপনার Firebase Console থেকে পাওয়া কনফিগারেশন বসান।
let firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};

// Check if localStorage has saved firebase config
const savedConfig = localStorage.getItem('user_firebase_config');
if (savedConfig) {
    try {
        firebaseConfig = JSON.parse(savedConfig);
    } catch (e) {
        console.error("Firebase config parse error", e);
    }
}

// Initialize Firebase if config exists
let isFirebaseInitialized = false;
let db = null;
let auth = null;

function initFirebase() {
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
