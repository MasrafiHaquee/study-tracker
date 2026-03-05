// Leaderboard Page Logic
import { auth, db } from '../js/firebase-config.js';
import { 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let currentPeriod = 'daily';

// Check authentication
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '../index.html';
        return;
    }
    
    currentUser = user;
    await loadUserData();
    await loadLeaderboard();
    initializeUI();
});

async function loadUserData() {
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists()) {
        const userData = userDoc.data();
        document.getElementById('userName').textContent = userData.name || 'User';
        document.getElementById('userAvatar').textContent = (userData.name || 'U').charAt(0).toUpperCase();
        
        if (userData.role === 'admin') {
            document.body.classList.add('admin');
        }
    }
}

async function loadLeaderboard() {
    const container = document.getElementById('leaderboardContainer');
    const podiumSection = document.getElementById('podiumSection');
    
    container.innerHTML = '<div class="loading">Loading leaderboard...</div>';
    podiumSection.innerHTML = '';
    
    try {
        // Get all users
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const usersMap = new Map();
        
        usersSnapshot.forEach(doc => {
            usersMap.set(doc.id, doc.data());
        });
        
        // Get leaderboard data
        const leaderboardRef = collection(db, 'leaderboardData');
        const q = query(leaderboardRef, orderBy('totalStudyTime', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state"><p>No leaderboard data yet</p></div>';
            return;
        }
        
        const rankings = [];
        snapshot.forEach(doc => {
            const userData = usersMap.get(doc.id);
            if (userData) {
                rankings.push({
                    userId: doc.id,
                    name: userData.name || 'Unknown',
                    role: userData.role || 'user',
                    ...doc.data()
                });
            }
        });
        
        // Display top 3 in podium
        if (rankings.length >= 1) {
            displayPodium(rankings.slice(0, 3));
        }
        
        // Display full leaderboard
        container.innerHTML = '';
        rankings.forEach((user, index) => {
            const rankItem = createRankItem(user, index + 1);
            container.appendChild(rankItem);
        });
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        container.innerHTML = '<div class="error-state">Error loading leaderboard</div>';
    }
}

function displayPodium(topThree) {
    const podiumSection = document.getElementById('podiumSection');
    podiumSection.innerHTML = '';
    
    const positions = [
        { data: topThree[1], place: 'second', medal: '🥈' },
        { data: topThree[0], place: 'first', medal: '🥇' },
        { data: topThree[2], place: 'third', medal: '🥉' }
    ];
    
    positions.forEach(pos => {
        if (!pos.data) return;
        
        const hours = Math.floor(pos.data.totalStudyTime / 60);
        const minutes = pos.data.totalStudyTime % 60;
        
        const podiumEl = document.createElement('div');
        podiumEl.className = `podium-place ${pos.place}`;
        podiumEl.innerHTML = `
            <div class="podium-avatar">
                ${pos.data.name.charAt(0).toUpperCase()}
                <span class="podium-medal">${pos.medal}</span>
            </div>
            <div class="podium-name">${pos.data.name}</div>
            <div class="podium-score">${hours}h ${minutes}m</div>
            <div class="podium-stand"></div>
        `;
        podiumSection.appendChild(podiumEl);
    });
}

function createRankItem(user, rank) {
    const item = document.createElement('div');
    item.className = 'rank-item';
    
    if (user.userId === currentUser.uid) {
        item.classList.add('current-user');
    }
    
    const hours = Math.floor(user.totalStudyTime / 60);
    const minutes = user.totalStudyTime % 60;
    
    const roleLabel = user.role === 'bot' ? '🤖 Bot' : '👤 Player';
    
    item.innerHTML = `
        <div class="rank-number">#${rank}</div>
        <div class="rank-avatar">${user.name.charAt(0).toUpperCase()}</div>
        <div class="rank-info">
            <div class="rank-name">${user.name}</div>
            <div class="rank-meta">${roleLabel}</div>
        </div>
        <div class="rank-score">
            <div class="rank-time">${hours}h ${minutes}m</div>
            <div class="rank-label">Total Study</div>
        </div>
    `;
    
    return item;
}

function initializeUI() {
    // Period filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            loadLeaderboard();
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = '../index.html';
    });
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.querySelector('.theme-icon').textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    
    themeToggle.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme');
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        document.querySelector('.theme-icon').textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
    
    // Mobile menu
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
}
