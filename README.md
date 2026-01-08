# Daily Todo List

A minimalist daily todo list application I built for my own purpose, but feel free to use it if you find it helpful!

## Features

- ✅ **One-time Tasks** - Add quick tasks for the day
- 🔄 **Recurring Routines** - Create routines with multiple tasks that repeat daily
- 📅 **Date Range Support** - Set routines to run for specific date periods
- 🔥 **Streak Tracking** - Track consecutive days you complete all tasks in a routine
- 📊 **Progress Display** - See completion status (e.g., 2/3 tasks completed)
- 🌙 **Dark Minimalist UI** - Clean, distraction-free interface
- 💾 **Persistent Storage** - Your data is saved in browser localStorage
- ♻️ **Auto Carry-Over** - Incomplete tasks automatically carry over to the next day

## Tech Stack

- **React** + **Vite** - Fast, modern development
- **Services Architecture** - Clean separation of concerns
- **localStorage** - Client-side data persistence

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Usage

### Adding One-Time Tasks
- Type your task in the input field
- Press Enter or click "Add"
- Check off when complete

### Creating Routines
1. Check "Create Routine"
2. Enter a routine name (e.g., "Morning Routine")
3. Set the date range (From - To)
4. Add multiple tasks to the routine
5. Click "Create Routine"

Each day, the routine appears with all its tasks. Check them off individually as you complete them. Build a streak by completing all tasks every day! 🔥

## Project Structure

```
src/
├── services/           # Business logic layer
│   ├── storageService.js    # localStorage operations
│   ├── dateService.js       # Date utilities
│   ├── taskService.js       # One-time task logic
│   ├── routineService.js    # Routine logic
│   └── displayService.js    # Display logic
├── App.jsx            # Main component
├── App.css            # Styles
└── main.jsx           # Entry point
```

## Data Storage

Your data is stored in your browser's localStorage:
- `daily_todo_tasks` - One-time tasks
- `daily_todo_routines` - Recurring routines

To view your data: Open DevTools (F12) → Application → Local Storage → http://localhost:5173

## License

Feel free to use this for your own purposes!

---

*Built with ❤️ for personal productivity*
