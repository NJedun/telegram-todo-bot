import { Telegraf } from "telegraf";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

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

// Tasks storage (file-based)
const TASKS_FILE = path.join(__dirname, "tasks.json");

// Load tasks from file
const loadTasks = () => {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      const data = fs.readFileSync(TASKS_FILE, "utf8");
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error("Error loading tasks:", error);
    return {};
  }
};

// Save tasks to file
const saveTasks = (tasks) => {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error("Error saving tasks:", error);
  }
};

// Initialize tasks storage - now using shared list (key: "shared")
let allTasks = loadTasks();
if (!allTasks.shared) {
  allTasks.shared = [];
}

// Bot commands
bot.start((ctx) => {
  const webAppUrl = `${WEBAPP_URL}/app`;

  ctx.reply(
    `👋 Welcome to your Shared To-Do List!\n\n` +
    `Click the button below to open your tasks.\n` +
    `Note: All users share the same task list.`,
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

  console.log('Login attempt - Received password:', password);
  console.log('Expected password:', APP_PASSWORD);
  console.log('Match:', password === APP_PASSWORD);

  if (password === APP_PASSWORD) {
    console.log('✅ Login successful');
    res.json({ success: true, token: APP_PASSWORD });
  } else {
    console.log('❌ Login failed - password mismatch');
    res.json({ success: false, message: "Incorrect password" });
  }
});

// GET /tasks - Get shared tasks (protected)
app.get("/tasks", authenticate, (req, res) => {
  const sharedTasks = allTasks.shared || [];
  res.json({ tasks: sharedTasks });
});

// POST /tasks - Update shared tasks (protected)
app.post("/tasks", authenticate, (req, res) => {
  const { tasks } = req.body;

  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: "tasks must be an array" });
  }

  allTasks.shared = tasks;
  saveTasks(allTasks);

  res.json({ success: true, tasks: allTasks.shared });
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
