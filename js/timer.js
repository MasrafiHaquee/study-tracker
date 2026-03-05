// Timer Page Logic
import { auth, db } from '../js/firebase-config.js';
import { 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    updateDoc,
    increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let timerInterval = null;
let elapsedSeconds = 0;
let isRunning = false;
let isPaused = false;

// Check authentication
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '../index.html';
        return;
    }
    
    currentUser = user;
    await loadUserData();
    await loadRecentSessions();
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

async function loadRecentSessions() {
    const container = document.getElementById('sessionsContainer');
    
    try {
        const sessionsRef = collection(db, 'studySessions');
        const q = query(
            sessionsRef,
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc'),
            limit(10)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state"><p>No sessions yet. Start your first study session!</p></div>';
            return;
        }
        
        container.innerHTML = '';
        
        snapshot.forEach(doc => {
            const session = doc.data();
            const hours = Math.floor(session.timeSpent / 60);
            const minutes = session.timeSpent % 60;
            const date = session.date.toDate();
            
            const sessionEl = document.createElement('div');
            sessionEl.className = 'session-item';
            sessionEl.innerHTML = `
                <div class="session-subject">${session.subject || 'Study Session'}</div>
                <div class="session-time">${hours}h ${minutes}m</div>
                <div class="session-date">${formatDate(date)}</div>
            `;
            container.appendChild(sessionEl);
        });
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

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

function startTimer() {
    const subject = document.getElementById('subjectInput').value.trim();
    
    if (!subject && !isRunning) {
        alert('Please enter a subject name');
        return;
    }
    
    isRunning = true;
    isPaused = false;
    
    document.getElementById('btnStart').classList.add('hidden');
    document.getElementById('btnPause').classList.remove('hidden');
    document.getElementById('btnStop').disabled = false;
    document.getElementById('subjectInput').disabled = true;
    
    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.classList.add('timer-running');
    
    timerInterval = setInterval(() => {
        elapsedSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function pauseTimer() {
    if (!isRunning) return;
    
    isPaused = true;
    clearInterval(timerInterval);
    
    document.getElementById('btnPause').classList.add('hidden');
    document.getElementById('btnStart').classList.remove('hidden');
    document.getElementById('btnStart').innerHTML = '<span>▶ Resume</span>';
    
    document.getElementById('timerDisplay').classList.remove('timer-running');
}

async function stopTimer() {
    if (!isRunning && elapsedSeconds === 0) return;
    
    clearInterval(timerInterval);
    
    const subject = document.getElementById('subjectInput').value.trim();
    const totalMinutes = Math.floor(elapsedSeconds / 60);
    
    if (totalMinutes > 0) {
        // Save session to Firestore
        try {
            await addDoc(collection(db, 'studySessions'), {
                userId: currentUser.uid,
                subject: subject || 'Study Session',
                timeSpent: totalMinutes,
                date: serverTimestamp()
            });
            
            // Update leaderboard data
            const leaderboardRef = doc(db, 'leaderboardData', currentUser.uid);
            const leaderboardDoc = await getDoc(leaderboardRef);
            
            if (leaderboardDoc.exists()) {
                await updateDoc(leaderboardRef, {
                    totalStudyTime: increment(totalMinutes),
                    weeklyTime: increment(totalMinutes),
                    monthlyTime: increment(totalMinutes)
                });
            } else {
                await setDoc(leaderboardRef, {
                    totalStudyTime: totalMinutes,
                    weeklyTime: totalMinutes,
                    monthlyTime: totalMinutes
                });
            }
            
            // Update streak
            await updateStreak();
            
            // Show success message
            alert(`Great job! Studied ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`);
            
            // Reload sessions
            await loadRecentSessions();
        } catch (error) {
            console.error('Error saving session:', error);
            alert('Error saving session. Please try again.');
        }
    }
    
    // Reset timer
    resetTimer();
}

async function updateStreak() {
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Check if user studied today
            const sessionsRef = collection(db, 'studySessions');
            const q = query(
                sessionsRef,
                where('userId', '==', currentUser.uid),
                where('date', '>=', today)
            );
            
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const currentStreak = (userData.currentStreak || 0) + 1;
                const longestStreak = Math.max(currentStreak, userData.longestStreak || 0);
                
                await updateDoc(userRef, {
                    currentStreak,
                    longestStreak
                });
            }
        }
    } catch (error) {
        console.error('Error updating streak:', error);
    }
}

function resetTimer() {
    isRunning = false;
    isPaused = false;
    elapsedSeconds = 0;
    
    updateTimerDisplay();
    
    document.getElementById('btnStart').classList.remove('hidden');
    document.getElementById('btnPause').classList.add('hidden');
    document.getElementById('btnStop').disabled = true;
    document.getElementById('btnStart').innerHTML = '<span>▶ Start</span>';
    document.getElementById('subjectInput').disabled = false;
    document.getElementById('subjectInput').value = '';
    
    document.getElementById('timerDisplay').classList.remove('timer-running');
}

function updateTimerDisplay() {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    
    const display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('timerDisplay').textContent = display;
    
    // Update stats
    const statsEl = document.getElementById('timerStats');
    if (elapsedSeconds > 0) {
        statsEl.textContent = `Total: ${Math.floor(elapsedSeconds / 60)} minutes`;
    } else {
        statsEl.textContent = '';
    }
}

function initializeUI() {
    // Timer controls
    document.getElementById('btnStart').addEventListener('click', startTimer);
    document.getElementById('btnPause').addEventListener('click', pauseTimer);
    document.getElementById('btnStop').addEventListener('click', stopTimer);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        if (isRunning) {
            if (!confirm('Timer is running. Are you sure you want to logout?')) {
                return;
            }
        }
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

// Import setDoc
import { setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
