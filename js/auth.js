// Authentication Logic
import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Check if user is already logged in
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in, redirect to dashboard
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            window.location.href = 'pages/dashboard.html';
        }
    }
});

// Login Form Handler
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('.btn-primary');
        
        // Show loading state
        submitBtn.classList.add('loading');
        errorMessage.classList.remove('show');
        
        try {
            // Sign in with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Check if user exists in Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
                // Successful login - redirect to dashboard
                window.location.href = 'pages/dashboard.html';
            } else {
                throw new Error('User profile not found');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            submitBtn.classList.remove('loading');
            
            let errorMsg = 'Login failed. Please try again.';
            
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMsg = 'Invalid email address.';
                    break;
                case 'auth/user-disabled':
                    errorMsg = 'This account has been disabled.';
                    break;
                case 'auth/user-not-found':
                    errorMsg = 'No account found with this email.';
                    break;
                case 'auth/wrong-password':
                    errorMsg = 'Incorrect password.';
                    break;
                case 'auth/invalid-credential':
                    errorMsg = 'Invalid email or password.';
                    break;
            }
            
            errorMessage.textContent = errorMsg;
            errorMessage.classList.add('show');
        }
    });
}

// Export auth functions for use in other files
export { auth, signOut };
