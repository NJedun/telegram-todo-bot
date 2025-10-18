// Check authentication
const authToken = localStorage.getItem('authToken');
if (!authToken) {
  window.location.href = '/';
}

// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

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
const tabBtns = document.querySelectorAll('.tab-btn');
const toggleBtns = document.querySelectorAll('.toggle-btn');

// State
let tasks = [];
let currentFilter = 'active'; // 'all', 'active', 'completed'
let currentList = 'shared'; // 'shared' (Travel) or 'goals'

// API Base URL (adjust for production)
const API_URL = window.location.origin;

// Initialize app
async function init() {
  // Display user info
  const userName = tg.initDataUnsafe?.user?.first_name || 'User';
  userInfo.textContent = `Welcome, ${userName}! (Shared List)`;

  // Load tasks
  await loadTasks();

  // Event listeners
  addBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTask();
    }
  });

  // Tab filter listeners
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active tab
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update filter
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  // List toggle listeners
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active toggle
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update current list
      currentList = btn.dataset.list;

      // Load tasks for the new list
      loadTasks();

      // Haptic feedback
      tg.HapticFeedback?.impactOccurred('light');
    });
  });

  // Provide haptic feedback
  tg.ready();
}

// Load tasks from server
async function loadTasks() {
  try {
    console.log(`Loading tasks for list: ${currentList}`);
    const response = await fetch(`${API_URL}/tasks?list=${currentList}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.status === 401) {
      // Token invalid, redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/';
      return;
    }

    const data = await response.json();
    tasks = data.tasks || [];
    console.log(`Loaded ${tasks.length} tasks from ${currentList}:`, tasks);
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
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        tasks: tasks,
        list: currentList
      })
    });

    if (response.status === 401) {
      // Token invalid, redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/';
      return;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving tasks:', error);
    throw error;
  }
}

// Add new task
async function addTask() {
  const text = taskInput.value.trim();

  if (!text) {
    tg.HapticFeedback?.notificationOccurred('error');
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
  tg.HapticFeedback?.impactOccurred('light');

  renderTasks();

  try {
    await saveTasks();
  } catch (error) {
    // Revert if save failed
    tasks.shift();
    renderTasks();
    alert('Failed to save task: ' + error.message);
  }
}

// Toggle task completion
async function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    console.log(`Task toggled: ${task.text}, done: ${task.done}, list: ${currentList}`);
    tg.HapticFeedback.impactOccurred('light');
    renderTasks();
    await saveTasks();
    console.log(`Task saved to ${currentList} list`);
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

  // Filter tasks based on current tab
  let filteredTasks = tasks;
  if (currentFilter === 'active') {
    filteredTasks = tasks.filter(t => !t.done);
  } else if (currentFilter === 'completed') {
    filteredTasks = tasks.filter(t => t.done);
  }

  if (filteredTasks.length === 0) {
    emptyState.classList.remove('hidden');
    if (currentFilter === 'active') {
      emptyState.querySelector('p').textContent = 'Нет активных задач!';
      emptyState.querySelector('.empty-subtitle').textContent = 'Все задачи выполнены 🎉';
    } else if (currentFilter === 'completed') {
      emptyState.querySelector('p').textContent = 'Нет завершенных задач!';
      emptyState.querySelector('.empty-subtitle').textContent = 'Отметьте задачи как выполненные';
    } else {
      emptyState.querySelector('p').textContent = 'Пока нет задач!';
      emptyState.querySelector('.empty-subtitle').textContent = 'Добавьте вашу первую задачу выше';
    }
  } else {
    emptyState.classList.add('hidden');

    filteredTasks.forEach(task => {
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
  taskItem.draggable = true;
  taskItem.dataset.taskId = task.id;

  // Drag handle
  const dragHandle = document.createElement('div');
  dragHandle.className = 'drag-handle';
  dragHandle.innerHTML = '⋮⋮';

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

  // Drag events
  taskItem.addEventListener('dragstart', handleDragStart);
  taskItem.addEventListener('dragover', handleDragOver);
  taskItem.addEventListener('drop', handleDrop);
  taskItem.addEventListener('dragend', handleDragEnd);

  taskItem.appendChild(dragHandle);
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
    statsText.textContent = 'Нет задач';
  } else if (completed === total) {
    statsText.textContent = `🎉 Все ${total} задач выполнено!`;
  } else {
    statsText.textContent = `${pending} активных · ${completed} завершено · ${total} всего`;
  }
}

// Drag and drop functionality
let draggedElement = null;

function handleDragStart(e) {
  draggedElement = e.target;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', e.target.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';

  const afterElement = getDragAfterElement(tasksList, e.clientY);
  const draggable = draggedElement;

  if (afterElement == null) {
    tasksList.appendChild(draggable);
  } else {
    tasksList.insertBefore(draggable, afterElement);
  }

  return false;
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }

  // Update tasks array to match new order
  const taskElements = Array.from(tasksList.children);
  const newTasks = taskElements.map(el => {
    const taskId = parseInt(el.dataset.taskId);
    return tasks.find(t => t.id === taskId);
  }).filter(t => t !== undefined);

  tasks = newTasks;
  saveTasks();

  return false;
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedElement = null;
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Start the app
init();
