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

if (!BOT_TOKEN) {
  console.error("❌ Error: BOT_TOKEN not found. Check your .env file.");
  process.exit(1);
}

// Initialize Express app
const app = express();
app.use(express.json());
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

// Initialize tasks storage
let allTasks = loadTasks();

// Bot commands
bot.start((ctx) => {
  const webAppUrl = `${WEBAPP_URL}?userId=${ctx.from.id}`;

  ctx.reply(
    `👋 Welcome to your To-Do List!\n\n` +
    `Click the button below to open your tasks.`,
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

// GET /tasks - Get all tasks for a user
app.get("/tasks", (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const userTasks = allTasks[userId] || [];
  res.json({ tasks: userTasks });
});

// POST /tasks - Update tasks for a user
app.post("/tasks", (req, res) => {
  const { userId, tasks } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: "tasks must be an array" });
  }

  allTasks[userId] = tasks;
  saveTasks(allTasks);

  res.json({ success: true, tasks: allTasks[userId] });
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
