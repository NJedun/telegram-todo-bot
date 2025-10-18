import { Telegraf, session } from "telegraf";
import fs from "fs";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ Ошибка: BOT_TOKEN не найден. Проверь .env файл.");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.use(session());

// Загружаем список задач из файла
const loadTasks = () => {
  try {
    return JSON.parse(fs.readFileSync("tasks.json", "utf8"));
  } catch {
    return [];
  }
};

// Сохраняем задачи в файл
const saveTasks = (tasks) => {
  fs.writeFileSync("tasks.json", JSON.stringify(tasks, null, 2));
};

// Общий список
let tasks = loadTasks();

bot.start((ctx) => {
  ctx.reply(
    "Привет! 👋 Это ваш общий список дел.\n\n" +
      "Используй команды:\n" +
      "/add — добавить задачу\n" +
      "/list — показать список\n" +
      "/done — отметить выполненной\n" +
      "/delete — удалить задачу"
  );
});

// Добавление задачи
bot.command("add", async (ctx) => {
  ctx.reply("✏️ Напиши текст задачи:");
  ctx.session = { state: "adding" };
});

bot.on("text", (ctx) => {
  if (!ctx.session) ctx.session = {};

  if (ctx.session.state === "adding") {
    tasks.push({ text: ctx.message.text, done: false });
    saveTasks(tasks);
    ctx.reply("✅ Задача добавлена!");
    ctx.session.state = null;
  } else if (ctx.session.state === "marking") {
    const index = parseInt(ctx.message.text) - 1;
    if (index >= 0 && index < tasks.length) {
      tasks[index].done = true;
      saveTasks(tasks);
      ctx.reply("🎉 Задача отмечена выполненной!");
    } else {
      ctx.reply("❌ Неверный номер.");
    }
    ctx.session.state = null;
  } else if (ctx.session.state === "deleting") {
    const index = parseInt(ctx.message.text) - 1;
    if (index >= 0 && index < tasks.length) {
      const deleted = tasks.splice(index, 1);
      saveTasks(tasks);
      ctx.reply(`🗑 Удалена: ${deleted[0].text}`);
    } else {
      ctx.reply("❌ Неверный номер.");
    }
    ctx.session.state = null;
  }
});

// Показ списка
bot.command("list", (ctx) => {
  if (tasks.length === 0) {
    ctx.reply("📭 Список пуст.");
  } else {
    const list = tasks
      .map(
        (t, i) =>
          `${i + 1}. ${t.done ? "✅" : "⬜️"} ${t.text}`
      )
      .join("\n");
    ctx.reply(`📋 Текущий список:\n\n${list}`);
  }
});

// Отметить задачу выполненной
bot.command("done", (ctx) => {
  if (tasks.length === 0) return ctx.reply("📭 Список пуст.");
  ctx.reply("Напиши номер задачи для отметки выполненной:");
  ctx.session = { state: "marking" };
});

// Удалить задачу
bot.command("delete", (ctx) => {
  if (tasks.length === 0) return ctx.reply("📭 Список пуст.");
  ctx.reply("Напиши номер задачи для удаления:");
  ctx.session = { state: "deleting" };
});

bot.launch();
console.log("✅ Бот запущен...");
