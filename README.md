# Telegram To-Do List Mini App

A modern, full-featured To-Do list application built as a Telegram Mini App (WebApp). Users can manage their tasks through a beautiful web interface that opens directly inside Telegram.

## Features

- **Modern Web UI** - Clean, responsive interface with smooth animations
- **Telegram Integration** - Opens directly in Telegram with native feel
- **Multi-user Support** - Each user has their own task list
- **Real-time Sync** - Tasks sync instantly with the backend
- **Telegram Theme** - Automatically adapts to user's Telegram theme colors
- **Haptic Feedback** - Native-like feedback on interactions
- **Persistent Storage** - Tasks saved in JSON file (easily upgradable to database)

## Tech Stack

- **Backend**: Node.js + Express.js
- **Bot Framework**: Telegraf
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Storage**: JSON file (can be upgraded to Firebase/Supabase)

## Project Structure

```
telegram-todo-bot/
├── bot.js                 # Main server (Telegraf + Express)
├── package.json           # Dependencies
├── .env                   # Environment variables (create from .env.example)
├── .env.example           # Example environment variables
├── tasks.json            # Task storage (auto-generated)
├── .gitignore            # Git ignore rules
├── public/               # WebApp frontend files
│   ├── index.html        # Main HTML
│   ├── style.css         # Styles with Telegram theme
│   └── app.js            # Frontend JavaScript
└── README.md             # This file
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- A Telegram account
- ngrok (for local development) or a public domain (for production)

### 2. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the instructions
3. Choose a name and username for your bot
4. Copy the **Bot Token** (looks like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 3. Clone and Install

```bash
# Navigate to project directory
cd telegram-todo-bot

# Install dependencies
npm install
```

### 4. Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your bot token:
```
BOT_TOKEN=your_bot_token_here
PORT=3000
WEBAPP_URL=https://your-domain.com
```

### 5. Local Development with ngrok

For local testing, you need to expose your localhost to the internet using ngrok:

1. Install ngrok: https://ngrok.com/download
2. Start ngrok:
```bash
ngrok http 3000
```
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Update `.env`:
```
WEBAPP_URL=https://abc123.ngrok.io
```

### 6. Run the Application

```bash
# Start the bot and server
npm start

# Or use auto-reload during development
npm run dev
```

You should see:
```
✅ Express server running on port 3000
📱 WebApp URL: https://your-domain.com
✅ Telegram bot started...
```

### 7. Test Your Bot

1. Open Telegram
2. Search for your bot by username
3. Send `/start`
4. Click the **"📝 Open To-Do"** button
5. The WebApp should open with your task list!

## Usage

### Bot Commands

- `/start` - Display welcome message and open To-Do button
- `/help` - Show help information

### WebApp Features

- **Add Task**: Type in the input field and click the `+` button or press Enter
- **Complete Task**: Click the checkbox to mark a task as done/undone
- **Delete Task**: Click the trash icon to delete a task
- **View Stats**: See task statistics at the bottom of the screen

## API Endpoints

The Express server provides these endpoints:

- `GET /tasks?userId=<userId>` - Get all tasks for a user
- `POST /tasks` - Update tasks for a user
  ```json
  {
    "userId": "123456789",
    "tasks": [
      {
        "id": 1234567890,
        "text": "Buy groceries",
        "done": false,
        "createdAt": "2025-10-18T12:00:00.000Z"
      }
    ]
  }
  ```
- `GET /health` - Health check endpoint

## Production Deployment

### Option 1: Deploy to a VPS (DigitalOcean, AWS, etc.)

1. Set up a server with Node.js
2. Clone your repository
3. Install dependencies: `npm install`
4. Set up environment variables
5. Use PM2 to keep the bot running:
```bash
npm install -g pm2
pm2 start bot.js --name telegram-todo-bot
pm2 save
pm2 startup
```
6. Configure nginx as reverse proxy (optional)

### Option 2: Deploy to Heroku

1. Create a Heroku app
2. Add environment variables in Heroku dashboard
3. Deploy:
```bash
git push heroku main
```

### Option 3: Deploy to Railway/Render

1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

**Important**: Update `WEBAPP_URL` in `.env` to your production domain!

## Upgrading to Database

To switch from JSON file to Firebase/Supabase:

1. Install the SDK:
```bash
npm install firebase
# or
npm install @supabase/supabase-js
```

2. Replace `loadTasks()` and `saveTasks()` functions in `bot.js`
3. Initialize your database client
4. Update the API endpoints to use database queries

## Customization

### Change Theme Colors

Edit `public/style.css` and modify the `:root` variables:
```css
:root {
  --primary-color: #your-color;
  --success-color: #your-color;
  --danger-color: #your-color;
}
```

### Add New Features

- Edit `public/app.js` for frontend logic
- Edit `bot.js` for backend API and bot commands
- Edit `public/index.html` for UI structure
- Edit `public/style.css` for styling

## Troubleshooting

### Bot doesn't respond
- Check if `BOT_TOKEN` is correct in `.env`
- Ensure the bot is running (`npm start`)
- Check console for error messages

### WebApp doesn't open
- Verify `WEBAPP_URL` is set correctly
- Ensure the URL is HTTPS (required by Telegram)
- Check if ngrok is running (for local dev)
- Make sure port 3000 is accessible

### Tasks don't save
- Check file permissions for `tasks.json`
- Verify the API endpoints are working (`GET /health`)
- Check browser console for errors

## Contributing

Feel free to fork this project and customize it for your needs!

## License

ISC

## Credits

Built with Telegraf, Express, and the Telegram Bot API.
