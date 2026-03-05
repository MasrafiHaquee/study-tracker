// Tasks Page Logic
import { auth, db } from '../js/firebase-config.js';
import { 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let currentFilter = 'all';
let editingTaskId = null;

// Check authentication
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '../index.html';
        return;
    }
    
    currentUser = user;
    await loadUserData();
    await loadTasks();
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

async function loadTasks() {
    const tasksContainer = document.getElementById('tasksContainer');
    tasksContainer.innerHTML = '<div class="loading">Loading tasks...</div>';
    
    try {
        const tasksRef = collection(db, 'tasks');
        const q = query(tasksRef, where('userId', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            tasksContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <p>No tasks yet</p>
                    <button class="btn-secondary" id="btnAddTaskEmpty">Create your first task</button>
                </div>
            `;
            
            document.getElementById('btnAddTaskEmpty').addEventListener('click', openTaskModal);
            return;
        }
        
        tasksContainer.innerHTML = '';
        
        snapshot.forEach(doc => {
            const task = { id: doc.id, ...doc.data() };
            if (shouldShowTask(task)) {
                createTaskCard(task, tasksContainer);
            }
        });
    } catch (error) {
        console.error('Error loading tasks:', error);
        tasksContainer.innerHTML = '<div class="error-state">Error loading tasks</div>';
    }
}

function shouldShowTask(task) {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'completed') return task.status === 'completed';
    if (currentFilter === 'pending') return task.status !== 'completed';
    return true;
}

function createTaskCard(task, container) {
    const card = document.createElement('div');
    card.className = `task-card ${task.status === 'completed' ? 'completed' : ''}`;
    card.dataset.taskId = task.id;
    
    const deadline = new Date(task.deadline);
    const isOverdue = deadline < new Date() && task.status !== 'completed';
    
    card.innerHTML = `
        <div class="task-checkbox ${task.status === 'completed' ? 'checked' : ''}" data-task-id="${task.id}"></div>
        <div class="task-content">
            <div class="task-title">${task.title}</div>
            <div class="task-meta">
                <span class="task-meta-item">📚 ${task.subject}</span>
                <span class="task-meta-item">⏱️ ${task.estimatedTime}h</span>
                <span class="task-meta-item task-deadline ${isOverdue ? 'overdue' : ''}">
                    📅 ${deadline.toLocaleDateString()}
                </span>
            </div>
        </div>
        <div class="task-actions">
            <button class="task-action-btn edit" data-task-id="${task.id}">✏️</button>
            <button class="task-action-btn delete" data-task-id="${task.id}">🗑️</button>
        </div>
    `;
    
    container.appendChild(card);
    
    // Add event listeners
    card.querySelector('.task-checkbox').addEventListener('click', () => toggleTaskStatus(task.id));
    card.querySelector('.edit').addEventListener('click', () => editTask(task));
    card.querySelector('.delete').addEventListener('click', () => deleteTask(task.id));
}

async function toggleTaskStatus(taskId) {
    try {
        const taskDoc = doc(db, 'tasks', taskId);
        const taskData = (await getDoc(taskDoc)).data();
        const newStatus = taskData.status === 'completed' ? 'pending' : 'completed';
        
        await updateDoc(taskDoc, { status: newStatus });
        await loadTasks();
    } catch (error) {
        console.error('Error toggling task:', error);
    }
}

function openTaskModal(task = null) {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const title = document.getElementById('modalTitle');
    
    if (task) {
        editingTaskId = task.id;
        title.textContent = 'Edit Task';
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskSubject').value = task.subject;
        document.getElementById('taskTime').value = task.estimatedTime;
        document.getElementById('taskDeadline').value = task.deadline;
    } else {
        editingTaskId = null;
        title.textContent = 'New Task';
        form.reset();
    }
    
    modal.classList.add('show');
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    modal.classList.remove('show');
    editingTaskId = null;
}

async function saveTask(e) {
    e.preventDefault();
    
    const taskData = {
        title: document.getElementById('taskTitle').value,
        subject: document.getElementById('taskSubject').value,
        estimatedTime: parseFloat(document.getElementById('taskTime').value),
        deadline: document.getElementById('taskDeadline').value,
        userId: currentUser.uid,
        status: 'pending'
    };
    
    try {
        if (editingTaskId) {
            await updateDoc(doc(db, 'tasks', editingTaskId), taskData);
        } else {
            await addDoc(collection(db, 'tasks'), {
                ...taskData,
                createdAt: serverTimestamp()
            });
        }
        
        closeTaskModal();
        await loadTasks();
    } catch (error) {
        console.error('Error saving task:', error);
        alert('Error saving task. Please try again.');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        await deleteDoc(doc(db, 'tasks', taskId));
        await loadTasks();
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

function editTask(task) {
    openTaskModal(task);
}

function initializeUI() {
    // Add task button
    document.getElementById('btnAddTask').addEventListener('click', () => openTaskModal());
    
    // Modal close
    document.getElementById('modalClose').addEventListener('click', closeTaskModal);
    document.getElementById('btnCancel').addEventListener('click', closeTaskModal);
    
    // Task form
    document.getElementById('taskForm').addEventListener('submit', saveTask);
    
    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            loadTasks();
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

// Import getDoc
import { getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
