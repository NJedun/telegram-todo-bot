// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Get user ID from URL or Telegram WebApp
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('userId') || tg.initDataUnsafe?.user?.id || 'demo';

// Apply Telegram theme colors
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc');
document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f4f4f5');

// DOM Elements
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const tasksList = document.getElementById('tasksList');
const emptyState = document.getElementById('emptyState');
const statsText = document.getElementById('statsText');
const userInfo = document.getElementById('userInfo');

// State
let tasks = [];

// API Base URL (adjust for production)
const API_URL = window.location.origin;

// Initialize app
async function init() {
  // Display user info
  const userName = tg.initDataUnsafe?.user?.first_name || 'User';
  userInfo.textContent = `Welcome, ${userName}!`;

  // Load tasks
  await loadTasks();

  // Event listeners
  addBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTask();
    }
  });

  // Provide haptic feedback
  tg.ready();
}

// Load tasks from server
async function loadTasks() {
  try {
    const response = await fetch(`${API_URL}/tasks?userId=${userId}`);
    const data = await response.json();
    tasks = data.tasks || [];
    renderTasks();
  } catch (error) {
    console.error('Error loading tasks:', error);
    tg.showAlert('Failed to load tasks. Please try again.');
  }
}

// Save tasks to server
async function saveTasks() {
  try {
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        tasks: tasks
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save tasks');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving tasks:', error);
    tg.showAlert('Failed to save tasks. Please try again.');
    throw error;
  }
}

// Add new task
async function addTask() {
  const text = taskInput.value.trim();

  if (!text) {
    tg.HapticFeedback.notificationOccurred('error');
    return;
  }

  const newTask = {
    id: Date.now(),
    text: text,
    done: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);
  taskInput.value = '';

  // Haptic feedback
  tg.HapticFeedback.impactOccurred('light');

  renderTasks();
  await saveTasks();
}

// Toggle task completion
async function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    tg.HapticFeedback.impactOccurred('light');
    renderTasks();
    await saveTasks();
  }
}

// Delete task
async function deleteTask(id) {
  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex !== -1) {
    // Confirm deletion
    const task = tasks[taskIndex];
    const confirmed = confirm(`Delete task: "${task.text}"?`);

    if (confirmed) {
      tasks.splice(taskIndex, 1);
      tg.HapticFeedback.notificationOccurred('success');
      renderTasks();
      await saveTasks();
    }
  }
}

// Render tasks to DOM
function renderTasks() {
  tasksList.innerHTML = '';

  if (tasks.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');

    tasks.forEach(task => {
      const taskItem = createTaskElement(task);
      tasksList.appendChild(taskItem);
    });
  }

  updateStats();
}

// Create task element
function createTaskElement(task) {
  const taskItem = document.createElement('div');
  taskItem.className = `task-item ${task.done ? 'completed' : ''}`;

  // Checkbox
  const checkbox = document.createElement('div');
  checkbox.className = `task-checkbox ${task.done ? 'checked' : ''}`;
  checkbox.addEventListener('click', () => toggleTask(task.id));

  // Task text
  const taskText = document.createElement('div');
  taskText.className = 'task-text';
  taskText.textContent = task.text;

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.innerHTML = '🗑';
  deleteBtn.addEventListener('click', () => deleteTask(task.id));

  taskItem.appendChild(checkbox);
  taskItem.appendChild(taskText);
  taskItem.appendChild(deleteBtn);

  return taskItem;
}

// Update statistics
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.done).length;
  const pending = total - completed;

  if (total === 0) {
    statsText.textContent = 'No tasks';
  } else if (completed === total) {
    statsText.textContent = `🎉 All ${total} tasks completed!`;
  } else {
    statsText.textContent = `${pending} pending · ${completed} completed · ${total} total`;
  }
}

// Start the app
init();
