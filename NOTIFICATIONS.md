# Notification System Guide

## How Notifications Work

Your browser will show desktop notifications and play a beep sound when:
1. ⏰ A task's reminder time arrives (if task is incomplete)
2. 🔄 A routine's reminder time arrives (if routine has incomplete tasks)
3. 📋 Daily reminder time (summary of all pending tasks)
4. 🔄 Routine reminder time (checks all incomplete routines)

## Sound Alert

Notifications include a **gentle beep sound** (800Hz sine wave, 0.5 seconds) to grab your attention even if you're not looking at the screen.

## Important Notes

### Browser Must Be Running
- ✅ **Browser can be minimized** - notifications will still work
- ✅ **Tab can be in background** - notifications will still work
- ❌ **Browser must be open** - closing the browser stops notifications

### Notification Requirements
- You must **enable notifications** in the settings (🔔 icon)
- Browser must have notification permission granted
- Notification times must be in the **future** (already passed times won't notify until tomorrow)
- **Tasks**: Only notify if incomplete
- **Routines**: Only notify if they have incomplete tasks for today

### Testing Notifications

1. Click the 🔔 icon and enable notifications
2. Set a time **2-3 minutes in the future**
3. Add a task with that reminder time
4. Wait for the notification - you'll hear a beep and see a desktop notification

### Troubleshooting

**Not getting notifications?**
- Check browser notification permissions (usually in address bar)
- Make sure the browser is still running
- Verify the time is in the future (not already passed)
- Check that tasks/routines are incomplete
- Look at browser console (F12) for any errors

**Want a different sound?**
The notification uses a simple beep. Your operating system may also play its default notification sound on top of this.

### Privacy & Storage

Notification settings are stored locally in your browser:
- `daily_todo_notification_settings` - your notification preferences
- Each device/browser needs its own notification setup
- No data is sent to any server - everything stays on your device

## Examples

### Task with Reminder
```
Task: "Call dentist"
Remind me at: 02:30 PM
→ At 2:30 PM: Beep + notification "⏰ Task Reminder: Call dentist"
```

### Routine with Reminder
```
Routine: "Evening Workout"
Tasks: Stretching, Cardio, Cool down
Remind at: 06:00 PM
→ At 6:00 PM (if incomplete): Beep + notification "🔄 Routine Reminder: Evening Workout: 1/3 completed"
```

### Daily Summary
```
Daily Reminder Time: 09:00 AM
→ At 9:00 AM: Beep + notification "📋 Daily Reminder: You have 5 pending tasks today"
```

---

**Need help?** Make sure to test with a time just a few minutes away to verify notifications are working!
