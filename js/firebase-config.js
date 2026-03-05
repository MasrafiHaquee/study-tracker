// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyBVE3nHGI0SEX7FOAGZjtKvQ2Hi8QEyj4E",
    authDomain: "study-with-me-f3dbc.firebaseapp.com",
    projectId: "study-with-me-f3dbc",
    storageBucket: "study-with-me-f3dbc.firebasestorage.app",
    messagingSenderId: "417518992327",
    appId: "1:417518992327:web:c9084c179b7ee2ac1277e2",
    measurementId: "G-FXDLD473LE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { app, auth, db, analytics };
