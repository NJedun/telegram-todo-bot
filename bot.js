import { Telegraf } from "telegraf";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { db } from "./firebase-config.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const WEBAPP_URL = process.env.WEBAPP_URL || `https://your-domain.com`;
const APP_PASSWORD = process.env.APP_PASSWORD || "password123";

if (!BOT_TOKEN) {
  console.error("❌ Error: BOT_TOKEN not found. Check your .env file.");
  process.exit(1);
}

// Initialize Express app
const app = express();
app.use(express.json());

// Authentication middleware
const authenticate = (req, res, next) => {
  const authToken = req.headers.authorization;

  if (!authToken || authToken !== `Bearer ${APP_PASSWORD}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
};

// Serve login page for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Serve main app (protected)
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Initialize Telegram bot
const bot = new Telegraf(BOT_TOKEN);

// Firestore collection reference
const tasksCollection = db.collection('tasks');

// Load tasks from Firestore
const loadTasks = async (listName = 'shared') => {
  try {
    const doc = await tasksCollection.doc(listName).get();
    if (doc.exists) {
      return doc.data().tasks || [];
    }
    return [];
  } catch (error) {
    console.error("Error loading tasks from Firestore:", error);
    return [];
  }
};

// Save tasks to Firestore
const saveTasks = async (tasks, listName = 'shared') => {
  try {
    await tasksCollection.doc(listName).set({
      tasks: tasks,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Error saving tasks to Firestore:", error);
    throw error;
  }
};

// Bot commands
bot.start((ctx) => {
  const webAppUrl = `${WEBAPP_URL}`;

  ctx.reply(
    `👋 Welcome to your Shared To-Do List!\n\n` +
    `Click the button below to open your tasks.\n` +
    `Note: You'll need to enter the password to access the shared list.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📝 Open To-Do", web_app: { url: webAppUrl } }]
        ]
      }
    }
  );
});

bot.command("help", (ctx) => {
  ctx.reply(
    `🤖 To-Do Bot Help\n\n` +
    `/start - Open the To-Do list\n` +
    `/help - Show this help message\n\n` +
    `Click "📝 Open To-Do" to manage your tasks!`
  );
});

// Express API endpoints

// Login endpoint
app.post("/auth/login", (req, res) => {
  const { password } = req.body;

  if (password === APP_PASSWORD) {
    res.json({ success: true, token: APP_PASSWORD });
  } else {
    res.json({ success: false, message: "Incorrect password" });
  }
});

// GET /tasks - Get tasks (protected)
app.get("/tasks", authenticate, async (req, res) => {
  try {
    const listName = req.query.list || 'shared';
    const tasks = await loadTasks(listName);
    res.json({ tasks: tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to load tasks" });
  }
});

// POST /tasks - Update tasks (protected)
app.post("/tasks", authenticate, async (req, res) => {
  try {
    const { tasks, list } = req.body;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: "tasks must be an array" });
    }

    const listName = list || 'shared';
    await saveTasks(tasks, listName);
    res.json({ success: true, tasks: tasks });
  } catch (error) {
    console.error("Error saving tasks:", error);
    res.status(500).json({ error: "Failed to save tasks" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`✅ Express server running on port ${PORT}`);
  console.log(`📱 WebApp URL: ${WEBAPP_URL}`);
});

// Start Telegram bot
bot.launch();
console.log("✅ Telegram bot started...");

// Enable graceful stop
process.once("SIGINT", () => {
  bot.stop("SIGINT");
  process.exit(0);
});

process.once("SIGTERM", () => {
  bot.stop("SIGTERM");
  process.exit(0);
});
