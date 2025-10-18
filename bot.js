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
const listsCollection = db.collection('lists');
const SHARED_DATA_DOC = 'shared';

// Default lists
const DEFAULT_LISTS = [
  { id: 'travel', name: 'Travel', emoji: '✈️' },
  { id: 'personal', name: 'Personal', emoji: '🎯' },
  { id: 'work', name: 'Work', emoji: '💼' },
  { id: 'shopping', name: 'Shopping', emoji: '🛒' }
];

// Load all data (lists and tasks)
const loadAllData = async () => {
  try {
    const doc = await listsCollection.doc(SHARED_DATA_DOC).get();
    if (doc.exists) {
      const data = doc.data();
      return {
        lists: data.lists || DEFAULT_LISTS,
        tasks: data.tasks || {}
      };
    }
    // Initialize with default lists
    const initialData = {
      lists: DEFAULT_LISTS,
      tasks: {}
    };
    await saveAllData(initialData);
    return initialData;
  } catch (error) {
    console.error("Error loading data from Firestore:", error);
    return { lists: DEFAULT_LISTS, tasks: {} };
  }
};

// Save all data to Firestore
const saveAllData = async (data) => {
  try {
    await listsCollection.doc(SHARED_DATA_DOC).set({
      lists: data.lists,
      tasks: data.tasks,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Error saving data to Firestore:", error);
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

// GET /data - Get all lists and tasks (protected)
app.get("/data", authenticate, async (req, res) => {
  try {
    const data = await loadAllData();
    res.json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Failed to load data" });
  }
});

// POST /data - Update all data (protected)
app.post("/data", authenticate, async (req, res) => {
  try {
    const { lists, tasks } = req.body;

    if (!Array.isArray(lists)) {
      return res.status(400).json({ error: "lists must be an array" });
    }

    if (typeof tasks !== 'object') {
      return res.status(400).json({ error: "tasks must be an object" });
    }

    await saveAllData({ lists, tasks });
    res.json({ success: true, lists, tasks });
  } catch (error) {
    console.error("Error saving data:", error);
    res.status(500).json({ error: "Failed to save data" });
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
