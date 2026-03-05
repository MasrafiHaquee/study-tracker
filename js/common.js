// Common functionality for placeholder pages
import { auth } from '../js/firebase-config.js';
import { 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '../index.html';
        return;
    }
    
    // Load user data
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
        const userData = userDoc.data();
        document.getElementById('userName').textContent = userData.name || 'User';
        document.getElementById('userAvatar').textContent = (userData.name || 'U').charAt(0).toUpperCase();
        
        if (userData.role === 'admin') {
            document.body.classList.add('admin');
        }
    }
    
    // Initialize UI
    initializeUI();
});

function initializeUI() {
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await signOut(auth);
            window.location.href = '../index.html';
        });
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const theme = document.documentElement.getAttribute('data-theme');
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            if (themeIcon) {
                themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
            }
        });
    }
    
    // Mobile menu
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
}
