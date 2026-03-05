// Dashboard Logic
import { auth, db } from '../js/firebase-config.js';
import { 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    getDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let userData = null;

// Check authentication
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '../index.html';
        return;
    }
    
    currentUser = user;
    await loadUserData();
    await loadDashboardData();
    initializeUI();
});

// Load user data
async function loadUserData() {
    try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            
            // Update UI with user info
            document.getElementById('userName').textContent = userData.name || 'User';
            document.getElementById('userAvatar').textContent = (userData.name || 'U').charAt(0).toUpperCase();
            
            // Show admin features if user is admin
            if (userData.role === 'admin') {
                document.body.classList.add('admin');
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load dashboard data
async function loadDashboardData() {
    await Promise.all([
        loadTodayStats(),
        loadStreakData(),
        loadTasksData(),
        loadRankingData(),
        loadWeeklyChart(),
        loadSubjectChart(),
        loadRecentSessions()
    ]);
}

// Load today's study statistics
async function loadTodayStats() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const sessionsRef = collection(db, 'studySessions');
        const q = query(
            sessionsRef,
            where('userId', '==', currentUser.uid),
            where('date', '>=', today)
        );
        
        const snapshot = await getDocs(q);
        let totalMinutes = 0;
        
        snapshot.forEach(doc => {
            totalMinutes += doc.data().timeSpent || 0;
        });
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        document.getElementById('todayStudy').textContent = `${hours}h ${minutes}m`;
        
        // Calculate change (placeholder)
        document.getElementById('todayChange').textContent = '+0%';
    } catch (error) {
        console.error('Error loading today stats:', error);
    }
}

// Load streak data
async function loadStreakData() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const data = userDoc.data();
        
        const currentStreak = data?.currentStreak || 0;
        const longestStreak = data?.longestStreak || 0;
        
        document.getElementById('currentStreak').textContent = `${currentStreak} days`;
        document.getElementById('longestStreak').textContent = `Best: ${longestStreak} days`;
    } catch (error) {
        console.error('Error loading streak data:', error);
    }
}

// Load tasks data
async function loadTasksData() {
    try {
        const tasksRef = collection(db, 'tasks');
        const q = query(
            tasksRef,
            where('userId', '==', currentUser.uid)
        );
        
        const snapshot = await getDocs(q);
        let totalTasks = 0;
        let completedTasks = 0;
        
        snapshot.forEach(doc => {
            totalTasks++;
            if (doc.data().status === 'completed') {
                completedTasks++;
            }
        });
        
        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        document.getElementById('tasksComplete').textContent = `${percentage}%`;
        document.getElementById('tasksMeta').textContent = `${completedTasks} of ${totalTasks}`;
    } catch (error) {
        console.error('Error loading tasks data:', error);
    }
}

// Load ranking data
async function loadRankingData() {
    try {
        const leaderboardRef = collection(db, 'leaderboardData');
        const q = query(leaderboardRef, orderBy('totalStudyTime', 'desc'));
        
        const snapshot = await getDocs(q);
        const rankings = [];
        
        snapshot.forEach(doc => {
            rankings.push({
                userId: doc.id,
                ...doc.data()
            });
        });
        
        const userRank = rankings.findIndex(r => r.userId === currentUser.uid) + 1;
        
        document.getElementById('userRank').textContent = userRank > 0 ? `#${userRank}` : '#-';
        document.getElementById('rankMeta').textContent = `of ${rankings.length} players`;
    } catch (error) {
        console.error('Error loading ranking data:', error);
        document.getElementById('userRank').textContent = '#-';
        document.getElementById('rankMeta').textContent = 'of 0 players';
    }
}

// Load weekly chart
async function loadWeeklyChart() {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;
    
    try {
        // Get last 7 days data
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        const last7Days = [];
        const studyData = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            last7Days.push(days[date.getDay()]);
            
            // Query sessions for this day
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            
            const sessionsRef = collection(db, 'studySessions');
            const q = query(
                sessionsRef,
                where('userId', '==', currentUser.uid),
                where('date', '>=', date),
                where('date', '<', nextDay)
            );
            
            const snapshot = await getDocs(q);
            let totalMinutes = 0;
            
            snapshot.forEach(doc => {
                totalMinutes += doc.data().timeSpent || 0;
            });
            
            studyData.push(Math.round(totalMinutes / 60 * 10) / 10); // Convert to hours
        }
        
        const totalHours = studyData.reduce((a, b) => a + b, 0);
        document.getElementById('weeklyTotal').textContent = `${totalHours.toFixed(1)}h this week`;
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Study Hours',
                    data: studyData,
                    backgroundColor: 'rgba(0, 217, 255, 0.6)',
                    borderColor: 'rgba(0, 217, 255, 1)',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + 'h';
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading weekly chart:', error);
    }
}

// Load subject chart
async function loadSubjectChart() {
    const ctx = document.getElementById('subjectChart');
    if (!ctx) return;
    
    try {
        const sessionsRef = collection(db, 'studySessions');
        const q = query(
            sessionsRef,
            where('userId', '==', currentUser.uid)
        );
        
        const snapshot = await getDocs(q);
        const subjectData = {};
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const subject = data.subject || 'Other';
            const time = data.timeSpent || 0;
            
            subjectData[subject] = (subjectData[subject] || 0) + time;
        });
        
        const subjects = Object.keys(subjectData);
        const hours = Object.values(subjectData).map(m => Math.round(m / 60 * 10) / 10);
        
        const totalHours = hours.reduce((a, b) => a + b, 0);
        document.getElementById('subjectTotal').textContent = `${totalHours.toFixed(1)}h total`;
        
        const colors = [
            'rgba(0, 217, 255, 0.8)',
            'rgba(255, 61, 113, 0.8)',
            'rgba(0, 230, 118, 0.8)',
            'rgba(255, 217, 61, 0.8)',
            'rgba(157, 78, 221, 0.8)'
        ];
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: subjects.length > 0 ? subjects : ['No Data'],
                datasets: [{
                    data: subjects.length > 0 ? hours : [1],
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading subject chart:', error);
    }
}

// Load recent sessions
async function loadRecentSessions() {
    try {
        const sessionsRef = collection(db, 'studySessions');
        const q = query(
            sessionsRef,
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc'),
            limit(5)
        );
        
        const snapshot = await getDocs(q);
        const container = document.getElementById('recentSessions');
        
        if (snapshot.empty) {
            return; // Keep empty state
        }
        
        container.innerHTML = '';
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const sessionEl = document.createElement('div');
            sessionEl.className = 'session-item';
            sessionEl.innerHTML = `
                <div class="session-subject">${data.subject || 'Study Session'}</div>
                <div class="session-time">${Math.floor(data.timeSpent / 60)}h ${data.timeSpent % 60}m</div>
                <div class="session-date">${formatDate(data.date.toDate())}</div>
            `;
            container.appendChild(sessionEl);
        });
    } catch (error) {
        console.error('Error loading recent sessions:', error);
    }
}

// Helper function to format date
function formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

// Initialize UI elements
function initializeUI() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = '../index.html';
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    if (themeToggle) {
        updateThemeIcon(currentTheme);
        
        themeToggle.addEventListener('click', () => {
            const theme = document.documentElement.getAttribute('data-theme');
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }
    
    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
}

function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}
