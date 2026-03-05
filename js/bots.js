// Bot Management & Auto-Simulation System
// Bots behave like real students - inconsistent, sometimes lazy, sometimes hardworking

import { auth, db } from '../js/firebase-config.js';
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    doc,
    getDoc,
    setDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;

// ============================================================
//  BOT DATA - 120 realistic Bengali/Indian student names
// ============================================================
const BOT_NAMES = [
    "Arjun Sharma","Priya Patel","Rohan Mehta","Sneha Gupta","Vikram Singh",
    "Ananya Roy","Rahul Verma","Kavya Nair","Aditya Kumar","Pooja Joshi",
    "Siddharth Das","Meera Iyer","Karan Malhotra","Divya Reddy","Aryan Bose",
    "Nisha Chandra","Amit Tiwari","Swati Rao","Harsh Pandey","Riya Mishra",
    "Varun Pillai","Priyanka Jain","Nikhil Agarwal","Shreya Banerjee","Mohit Dubey",
    "Anjali Shah","Tushar Patil","Sunita Desai","Gaurav Khanna","Mansi Sinha",
    "Akash Chowdhury","Deepika Bhatt","Sameer Kulkarni","Tanvi Mukherjee","Vivek Trivedi",
    "Neha Saxena","Rajesh Yadav","Shweta Pandey","Abhishek Srivastava","Kratika Bhardwaj",
    "Yash Oberoi","Ayesha Khan","Ritesh Jaiswal","Pallavi Ghosh","Sourav Dutta",
    "Roshani Biswas","Nitin Kaur","Madhuri Chakraborty","Farhan Hossain","Ishita Sen",
    "Kunal Basu","Trisha Lahiri","Dhruv Kapoor","Alisha Mondal","Parth Ghoshal",
    "Shreoshree Das","Arnab Chatterjee","Rupali Dey","Debjit Sarkar","Mouri Mandal",
    "Anik Saha","Priyabrata Paul","Susmita Halder","Souvik Mitra","Sayani Bose",
    "Aniket Roy","Poulomi Naskar","Rakesh Maity","Chandrani Koley","Biswajit Jana",
    "Mousumi Hazra","Subhajit Pal","Sangita Dhara","Tamal Bhowmik","Kaberi Giri",
    "Subhrangshu Samanta","Debarati Majhi","Atanu Pramanik","Supriya Patra","Sandip Bag",
    "Paramita Raut","Ashoke Shit","Shampa Das","Debashis Manna","Tanushree Adak",
    "Subrata Sau","Moumita Bera","Kartick Patra","Sudipta Gayen","Palash Karak",
    "Papiya Nanda","Tapan Ghosal","Sanchita Mal","Abhijit Kundu","Nilanjana Modak",
    "Arijit Nag","Barnali Dutta","Soumen Karmakar","Suchismita Banerjee","Ranjit Sarkar",
    "Priya Mondal","Goutam Biswas","Sarbari Roy","Pinak Mitra","Soumya Ghosh",
    "Kalyan Majumdar","Swapna Pal","Rajarshi Bose","Mitali Sen","Debdatta Saha",
    "Arunava Das","Sriparna Bhattacharya","Subhasish Chatterjee","Rumki Mukherjee","Tanmoy Dey",
    "Lipika Chakrabarti","Bhaskar Guha","Anindita Kundu","Supratim Roy","Sreyasi Das"
];

// Bot personality types - determines study pattern
const BOT_PERSONALITIES = [
    { type: "grinder",      minDaily: 180, maxDaily: 480, activeRate: 0.90, streakBoost: true  },  // hardcore studier
    { type: "consistent",   minDaily: 120, maxDaily: 300, activeRate: 0.85, streakBoost: false },  // steady
    { type: "casual",       minDaily: 30,  maxDaily: 180, activeRate: 0.70, streakBoost: false },  // lazy sometimes
    { type: "irregular",    minDaily: 0,   maxDaily: 360, activeRate: 0.55, streakBoost: false },  // very inconsistent
    { type: "night_owl",    minDaily: 60,  maxDaily: 240, activeRate: 0.75, streakBoost: false },  // studies at night
    { type: "weekend",      minDaily: 0,   maxDaily: 420, activeRate: 0.60, streakBoost: false },  // studies more on weekends
    { type: "burst",        minDaily: 0,   maxDaily: 600, activeRate: 0.50, streakBoost: true  },  // long sessions rarely
    { type: "moderate",     minDaily: 90,  maxDaily: 240, activeRate: 0.80, streakBoost: false },  // moderate pace
];

const SUBJECTS = [
    "Mathematics","Physics","Chemistry","Biology","English",
    "History","Geography","Computer Science","Economics","Bengali",
    "Political Science","Sociology","Statistics","Accountancy"
];

const AVATAR_COLORS = [
    "#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7",
    "#DDA0DD","#98D8C8","#F7DC6F","#BB8FCE","#82E0AA",
    "#F0B27A","#AED6F1","#A9DFBF","#F9E79F","#FADBD8"
];

// ============================================================
//  UTILITY FUNCTIONS
// ============================================================

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Seeded random for consistent bot behavior (same bot, same seed = same pattern)
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// Generate daily study minutes for a bot based on personality
function generateDailyMinutes(personality, dayOfWeek, seed) {
    const baseActive = seededRandom(seed) < personality.activeRate;
    
    if (!baseActive) return 0;

    let min = personality.minDaily;
    let max = personality.maxDaily;

    // Weekend warrior gets extra on weekends (day 0=Sun, 6=Sat)
    if (personality.type === "weekend" && (dayOfWeek === 0 || dayOfWeek === 6)) {
        min = 180;
        max = 480;
    }

    // Irregulars have very high variance
    if (personality.type === "irregular") {
        if (seededRandom(seed + 1) < 0.3) return 0; // 30% chance of skipping
        max = getRandomInt(60, 600);
    }

    // Add natural noise ±20%
    const base = getRandomInt(min, max);
    const noise = getRandomFloat(0.8, 1.2);
    return Math.round(base * noise);
}

// ============================================================
//  BOT GENERATION & SIMULATION
// ============================================================

function generateBotData(index) {
    const name = BOT_NAMES[index % BOT_NAMES.length];
    const personality = BOT_PERSONALITIES[index % BOT_PERSONALITIES.length];
    const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const subject = getRandomElement(SUBJECTS);
    
    // Simulate past 90 days of activity
    const now = new Date();
    let totalMinutes = 0;
    let studyDays = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let streakBuffer = 0;
    
    const dailyHistory = [];
    
    for (let d = 89; d >= 0; d--) {
        const day = new Date(now);
        day.setDate(day.getDate() - d);
        const dayOfWeek = day.getDay();
        const seed = index * 1000 + d;
        
        const minutes = generateDailyMinutes(personality, dayOfWeek, seed);
        
        if (minutes > 0) {
            totalMinutes += minutes;
            studyDays++;
            streakBuffer++;
            if (d < 30) currentStreak++; // Only count last 30 days for current streak
            longestStreak = Math.max(longestStreak, streakBuffer);
        } else {
            streakBuffer = 0;
            if (d < 30) currentStreak = 0; // Reset current streak
        }
        
        dailyHistory.push({ day: 89 - d, minutes });
    }

    // Calculate today and this week
    const todayMinutes = generateDailyMinutes(personality, now.getDay(), index * 9999);
    const weekMinutes = dailyHistory.slice(-7).reduce((sum, d) => sum + d.minutes, 0);

    return {
        botId: `bot_${index + 1}`,
        name,
        role: "bot",
        avatarColor: color,
        favoriteSubject: subject,
        personality: personality.type,
        totalStudyTime: totalMinutes,
        todayStudyTime: todayMinutes,
        weekStudyTime: weekMinutes,
        studyDays,
        currentStreak: Math.min(currentStreak, 30),
        longestStreak,
        isActive: seededRandom(index * 777) < personality.activeRate,
        createdAt: new Date(now - getRandomInt(30, 365) * 86400000),
        lastActive: new Date(now - getRandomInt(0, 5) * 86400000),
        simulationSeed: index
    };
}

// ============================================================
//  FIREBASE OPERATIONS
// ============================================================

async function initializeBots() {
    const btn = document.getElementById('initBotsBtn');
    const progress = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Initializing...';
    progress.style.display = 'block';
    progressBar.style.background = 'var(--color-primary)';

    const total = BOT_NAMES.length;
    const BATCH_SIZE = 50; // 50 bots × 2 writes = 100 per batch (safe under 500 limit)

    try {
        let committed = 0;

        for (let start = 0; start < total; start += BATCH_SIZE) {
            const end = Math.min(start + BATCH_SIZE, total);
            const batch = writeBatch(db);

            for (let i = start; i < end; i++) {
                const botData = generateBotData(i);
                const botRef = doc(db, "users", botData.botId);
                const lbRef  = doc(db, "leaderboardData", botData.botId);

                batch.set(botRef, {
                    name:            botData.name,
                    role:            "bot",
                    avatarColor:     botData.avatarColor,
                    favoriteSubject: botData.favoriteSubject,
                    personality:     botData.personality,
                    studyDays:       botData.studyDays,
                    currentStreak:   botData.currentStreak,
                    longestStreak:   botData.longestStreak,
                    isActive:        botData.isActive,
                    createdAt:       botData.createdAt,
                    lastActive:      botData.lastActive,
                    simulationSeed:  botData.simulationSeed
                });

                batch.set(lbRef, {
                    totalStudyTime: botData.totalStudyTime,
                    todayStudyTime: botData.todayStudyTime,
                    weekStudyTime:  botData.weekStudyTime,
                    lastUpdated:    new Date()
                });
            }

            await batch.commit();
            committed = end;

            const pct = Math.round((committed / total) * 100);
            progressBar.style.width = pct + '%';
            progressText.textContent = `Creating bots... ${committed}/${total}`;
        }

        progressBar.style.width = '100%';
        progressText.textContent = `✅ ${total} bots created successfully!`;
        progressBar.style.background = 'var(--color-success)';

        setTimeout(() => {
            loadBots();
            showToast(`${total} bots initialized successfully! 🤖`, 'success');
        }, 800);

    } catch (error) {
        console.error('Error initializing bots:', error);
        showToast('Error creating bots: ' + error.message, 'error');
        progressText.textContent = '❌ Error: ' + error.message;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">🤖</span> Initialize All Bots';
    }
}

async function simulateDailyActivity() {
    const btn = document.getElementById('simulateBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Simulating...';

    try {
        const botsRef = collection(db, "users");
        const q = query(botsRef, where("role", "==", "bot"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            showToast('No bots found. Initialize bots first!', 'warning');
            return;
        }

        const now = new Date();
        const batch = writeBatch(db);
        let updatedCount = 0;

        snapshot.forEach(docSnap => {
            const botData = docSnap.data();
            const seed = botData.simulationSeed || 0;
            const personality = BOT_PERSONALITIES.find(p => p.type === botData.personality) || BOT_PERSONALITIES[0];

            // Generate today's study time
            const todayMinutes = generateDailyMinutes(personality, now.getDay(), seed + now.getDate() + now.getMonth() * 31);

            const lbRef = doc(db, "leaderboardData", docSnap.id);
            batch.update(lbRef, {
                totalStudyTime: (botData.totalStudyTime || 0) + todayMinutes,
                todayStudyTime: todayMinutes,
                lastUpdated: now
            });

            // Update user record
            const userRef = doc(db, "users", docSnap.id);
            batch.update(userRef, {
                lastActive: now,
                studyDays: (botData.studyDays || 0) + (todayMinutes > 0 ? 1 : 0)
            });

            updatedCount++;
        });

        await batch.commit();
        showToast(`✅ ${updatedCount} bots simulated today's study session!`, 'success');
        loadBots();

    } catch (error) {
        console.error('Simulation error:', error);
        showToast('Simulation error: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">🔄</span> Simulate Today\'s Study';
    }
}

async function deleteAllBots() {
    if (!confirm('⚠️ Are you sure you want to delete ALL bots? This cannot be undone!')) return;

    const btn = document.getElementById('deleteBotsBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Deleting...';

    try {
        const botsRef = collection(db, "users");
        const q = query(botsRef, where("role", "==", "bot"));
        const snapshot = await getDocs(q);

        const batch = writeBatch(db);
        snapshot.forEach(docSnap => {
            batch.delete(doc(db, "users", docSnap.id));
            batch.delete(doc(db, "leaderboardData", docSnap.id));
        });

        await batch.commit();
        showToast(`🗑️ All ${snapshot.size} bots deleted!`, 'success');
        loadBots();

    } catch (error) {
        console.error('Delete error:', error);
        showToast('Delete error: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">🗑️</span> Delete All Bots';
    }
}

// ============================================================
//  UI RENDERING
// ============================================================

async function loadBots() {
    const container = document.getElementById('botsGrid');
    const statsEl = document.getElementById('botStats');
    container.innerHTML = '<div class="bots-loading"><div class="spinner"></div><p>Loading bots...</p></div>';

    try {
        const botsRef = collection(db, "users");
        const q = query(botsRef, where("role", "==", "bot"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-bots">
                    <div class="empty-icon">🤖</div>
                    <h3>No Bots Yet</h3>
                    <p>Click "Initialize All Bots" to create 120 AI bots with realistic study patterns.</p>
                </div>`;
            statsEl.innerHTML = '';
            return;
        }

        // Load leaderboard data for bots
        const lbMap = new Map();
        const lbRef = collection(db, "leaderboardData");
        const lbSnap = await getDocs(lbRef);
        lbSnap.forEach(d => lbMap.set(d.id, d.data()));

        const bots = [];
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            const lb = lbMap.get(docSnap.id) || {};
            bots.push({ id: docSnap.id, ...d, ...lb });
        });

        // Sort by total study time
        bots.sort((a, b) => (b.totalStudyTime || 0) - (a.totalStudyTime || 0));

        // Render stats
        const totalMinutes = bots.reduce((s, b) => s + (b.totalStudyTime || 0), 0);
        const activeBots = bots.filter(b => b.isActive).length;
        statsEl.innerHTML = `
            <div class="bot-stat-card">
                <div class="stat-icon">🤖</div>
                <div class="stat-value">${bots.length}</div>
                <div class="stat-label">Total Bots</div>
            </div>
            <div class="bot-stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-value">${activeBots}</div>
                <div class="stat-label">Active Bots</div>
            </div>
            <div class="bot-stat-card">
                <div class="stat-icon">📚</div>
                <div class="stat-value">${Math.round(totalMinutes / 60)}h</div>
                <div class="stat-label">Total Study Hours</div>
            </div>
            <div class="bot-stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-value">${Math.round(totalMinutes / bots.length / 60)}h</div>
                <div class="stat-label">Avg Per Bot</div>
            </div>
        `;

        // Render bot cards
        const filterPersonality = document.getElementById('filterPersonality')?.value || 'all';
        const searchQuery = document.getElementById('searchBots')?.value?.toLowerCase() || '';

        const filtered = bots.filter(b => {
            const matchPersonality = filterPersonality === 'all' || b.personality === filterPersonality;
            const matchSearch = !searchQuery || b.name.toLowerCase().includes(searchQuery);
            return matchPersonality && matchSearch;
        });

        container.innerHTML = '';
        filtered.forEach(bot => {
            container.appendChild(createBotCard(bot));
        });

        // Show count
        document.getElementById('botCount').textContent = `Showing ${filtered.length} of ${bots.length} bots`;

    } catch (error) {
        console.error('Error loading bots:', error);
        container.innerHTML = `<div class="error-state">❌ Error loading bots: ${error.message}</div>`;
    }
}

function createBotCard(bot) {
    const card = document.createElement('div');
    card.className = `bot-card ${bot.isActive ? 'active' : 'inactive'}`;

    const hours = Math.floor((bot.totalStudyTime || 0) / 60);
    const todayMins = bot.todayStudyTime || 0;
    const personalityEmoji = {
        grinder: '💪', consistent: '📘', casual: '😌',
        irregular: '🎲', night_owl: '🦉', weekend: '🏖️',
        burst: '⚡', moderate: '🎯'
    }[bot.personality] || '📚';

    const color = bot.avatarColor || '#00D9FF';
    const initials = bot.name.split(' ').map(n => n[0]).join('').substring(0, 2);

    card.innerHTML = `
        <div class="bot-card-header">
            <div class="bot-avatar" style="background: ${color}; color: #fff;">${initials}</div>
            <div class="bot-info">
                <div class="bot-name">${bot.name}</div>
                <div class="bot-meta">
                    <span class="personality-badge">${personalityEmoji} ${bot.personality}</span>
                    <span class="status-dot ${bot.isActive ? 'online' : 'offline'}"></span>
                </div>
            </div>
        </div>
        <div class="bot-stats-row">
            <div class="mini-stat">
                <span class="mini-val">${hours}h</span>
                <span class="mini-lbl">Total</span>
            </div>
            <div class="mini-stat">
                <span class="mini-val">${todayMins}m</span>
                <span class="mini-lbl">Today</span>
            </div>
            <div class="mini-stat">
                <span class="mini-val">${bot.currentStreak || 0}</span>
                <span class="mini-lbl">Streak</span>
            </div>
            <div class="mini-stat">
                <span class="mini-val">${bot.studyDays || 0}</span>
                <span class="mini-lbl">Days</span>
            </div>
        </div>
        <div class="bot-subject">📖 ${bot.favoriteSubject || 'General'}</div>
    `;

    return card;
}

// ============================================================
//  TOAST NOTIFICATION
// ============================================================
function showToast(message, type = 'success') {
    const existing = document.getElementById('toastNotif');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toastNotif';
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
//  INIT
// ============================================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    currentUser = user;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
        const userData = userDoc.data();
        document.getElementById('userName').textContent = userData.name || 'User';
        document.getElementById('userAvatar').textContent = (userData.name || 'U').charAt(0).toUpperCase();
        if (userData.role === 'admin') document.body.classList.add('admin');
    }

    // Load bots list
    loadBots();

    // Button events
    document.getElementById('initBotsBtn').addEventListener('click', initializeBots);
    document.getElementById('simulateBtn').addEventListener('click', simulateDailyActivity);
    document.getElementById('deleteBotsBtn').addEventListener('click', deleteAllBots);
    document.getElementById('refreshBtn').addEventListener('click', loadBots);

    // Search & filter
    document.getElementById('searchBots').addEventListener('input', loadBots);
    document.getElementById('filterPersonality').addEventListener('change', loadBots);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = '../index.html';
    });

    // Theme
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
});
