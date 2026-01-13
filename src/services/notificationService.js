import { taskStorage, routineStorage } from './storageService.js';
import { getTodayDate, isDateInRange } from './dateService.js';
import { isTaskCarriedOver } from './taskService.js';
import { getRoutineProgress } from './routineService.js';

// Notification settings storage
const SETTINGS_KEY = 'daily_todo_notification_settings';
const SCHEDULE_KEY = 'daily_todo_notification_schedule';

// Get username for personalized notifications
const getUsername = () => {
  return localStorage.getItem('daily_todo_username') || '';
};

// Save notification schedule for service worker
const saveNotificationSchedule = (schedule) => {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
};

// Get notification schedule
export const getNotificationSchedule = () => {
  const saved = localStorage.getItem(SCHEDULE_KEY);
  return saved ? JSON.parse(saved) : [];
};

// Send schedule to service worker for background notifications
const sendScheduleToServiceWorker = async () => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const schedule = getNotificationSchedule();
    const username = getUsername();
    
    navigator.serviceWorker.controller.postMessage({
      type: 'NOTIFICATION_SCHEDULE',
      schedule: schedule,
      username: username
    });
    
    console.log('Sent notification schedule to service worker:', schedule.length, 'items');
  }
};

const defaultSettings = {
  enabled: false,
  dailyReminderTime: '09:00', // 9 AM default
  routineRemindersEnabled: true,
  routineReminderTime: '20:00', // 8 PM default
};

// Get notification settings
export const getNotificationSettings = () => {
  const saved = localStorage.getItem(SETTINGS_KEY);
  return saved ? JSON.parse(saved) : defaultSettings;
};

// Save notification settings
export const saveNotificationSettings = (settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// Register Service Worker for notifications
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Unregister any existing service workers first (for updates)
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (!registration.active || registration.active.scriptURL.includes('service-worker.js')) {
          continue;
        }
      }
      
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });
      console.log('Service Worker registered successfully:', registration);
      
      // Wait for the service worker to be ready and active
      await navigator.serviceWorker.ready;
      console.log('Service Worker is ready');
      
      // Wait a bit to ensure controller is set
      if (!navigator.serviceWorker.controller) {
        await new Promise(resolve => {
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Service Worker controller changed');
            resolve();
          }, { once: true });
        });
      }
      
      // Register periodic background sync if available (Chrome Android)
      try {
        if ('periodicSync' in registration) {
          const status = await navigator.permissions.query({
            name: 'periodic-background-sync',
          });
          if (status.state === 'granted') {
            await registration.periodicSync.register('check-notifications', {
              minInterval: 60 * 1000, // 1 minute (browser may adjust)
            });
            console.log('Periodic background sync registered');
          }
        }
      } catch (error) {
        console.log('Periodic sync not supported:', error);
      }
      
      // Register sync event as fallback
      try {
        if ('sync' in registration) {
          await registration.sync.register('check-notifications');
          console.log('Sync event registered');
        }
      } catch (error) {
        console.log('Sync not supported:', error);
      }
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  } else {
    console.log('Service Workers not supported in this browser');
    return null;
  }
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    // Ensure service worker is registered
    await registerServiceWorker();
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Notification permission granted, registering service worker...');
        // Register service worker after permission granted
        await registerServiceWorker();
        // Wait a bit for service worker to be fully active
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      return permission === 'granted';
    } catch (error) {
      // Fallback for older mobile browsers
      console.log('Notification permission request failed:', error);
      return false;
    }
  }

  return false;
};

// Play notification sound
const playNotificationSound = () => {
  try {
    console.log('Attempting to play notification sound...');
    
    // Create a more audible beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Resume audio context if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      console.log('AudioContext suspended, attempting to resume...');
      audioContext.resume().then(() => {
        console.log('AudioContext resumed');
        playBeeps(audioContext);
      }).catch(err => {
        console.error('Failed to resume AudioContext:', err);
      });
    } else {
      playBeeps(audioContext);
    }
  } catch (error) {
    console.error('Could not play notification sound:', error);
  }
};

// Helper function to play the actual beep sounds - longer ringtone
const playBeeps = (audioContext) => {
  try {
    // Play a sequence of tones for a longer, more noticeable ringtone
    const tones = [
      { freq: 800, start: 0, duration: 0.15 },
      { freq: 1000, start: 0.15, duration: 0.15 },
      { freq: 1200, start: 0.3, duration: 0.2 },
      { freq: 1000, start: 0.55, duration: 0.15 },
      { freq: 800, start: 0.7, duration: 0.15 },
      { freq: 1000, start: 0.9, duration: 0.15 },
      { freq: 1200, start: 1.05, duration: 0.25 },
    ];
    
    tones.forEach((tone, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = tone.freq;
      oscillator.type = 'sine';
      
      const startTime = audioContext.currentTime + tone.start;
      const endTime = startTime + tone.duration;
      
      // Fade in and out for smoother sound
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
      gainNode.gain.setValueAtTime(0.5, endTime - 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);
      
      oscillator.start(startTime);
      oscillator.stop(endTime);
      
      console.log(`Tone ${index + 1} scheduled at ${tone.start}s`);
    });
    
    console.log('Long ringtone sequence started');
  } catch (error) {
    console.error('Error playing beeps:', error);
  }
};

// Helper function to create SVG icon data URI
const getIconSvg = (type) => {
  const icons = {
    bell: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23ff9500" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    task: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23ff9500" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    clock: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23ff9500" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    routine: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23ff9500" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    check: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2300ff00" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  };
  return `data:image/svg+xml,${icons[type] || icons.bell}`;
};

// Show a notification
const showNotification = async (title, body, iconType = 'task') => {
  console.log('showNotification called:', title, body);
  
  if (Notification.permission === 'granted') {
    try {
      console.log('Playing notification sound...');
      // Play sound
      playNotificationSound();
      
      console.log('Showing notification...');
      
      const icon = getIconSvg(iconType);
      const badge = getIconSvg('check');
      
      // Check if Service Worker is supported and active
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        console.log('Using Service Worker for notification');
        // Use Service Worker for better mobile support
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon,
          badge,
          requireInteraction: false,
          silent: false,
          vibrate: [200, 100, 200],
          tag: 'daily-todo-' + Date.now(),
          renotify: true,
          data: { url: window.location.href },
        });
        console.log('Service Worker notification created successfully');
      } else {
        console.log('Using regular Notification API');
        // Fallback to regular notification
        const notification = new Notification(title, {
          body,
          icon,
          badge,
          requireInteraction: false,
          silent: false,
          vibrate: [200, 100, 200],
          tag: 'daily-todo-' + Date.now(),
        });
        console.log('Regular notification created successfully');
        
        // Auto close after 10 seconds
        setTimeout(() => notification.close(), 10000);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  } else {
    console.warn('Notification permission not granted. Current permission:', Notification.permission);
  }
};

// Get daily summary
export const getDailySummary = () => {
  const today = getTodayDate();
  const tasks = taskStorage.getAll();
  const routines = routineStorage.getAll();

  let pendingTasks = 0;
  let completedTasks = 0;
  let pendingRoutines = 0;

  // Count one-time tasks
  tasks.forEach(task => {
    if (isTaskCarriedOver(task)) {
      if (task.completed && task.completedDate === today) {
        completedTasks++;
      } else if (!task.completed) {
        pendingTasks++;
      }
    }
  });

  // Count routine tasks
  routines.forEach(routine => {
    if (isDateInRange(today, routine.startDate, routine.endDate)) {
      const progress = getRoutineProgress(routine, today);
      pendingTasks += progress.total - progress.completed;
      completedTasks += progress.completed;
      
      if (progress.completed < progress.total) {
        pendingRoutines++;
      }
    }
  });

  return {
    pendingTasks,
    completedTasks,
    totalTasks: pendingTasks + completedTasks,
    pendingRoutines,
  };
};

// Send daily reminder notification
export const sendDailyReminder = () => {
  const summary = getDailySummary();
  const username = getUsername();
  const greeting = username ? `Hyyy ${username}! ` : 'Hey! ';
  
  if (summary.totalTasks === 0) {
    showNotification(
      'Daily Todo',
      `${greeting}No tasks for today. Start fresh!`,
      'task'
    );
  } else if (summary.pendingTasks === 0) {
    showNotification(
      'All Done!',
      `${greeting}You\'ve completed all your tasks for today!`,
      'check'
    );
  } else {
    showNotification(
      'Daily Reminder',
      `${greeting}You have ${summary.pendingTasks} pending task${summary.pendingTasks > 1 ? 's' : ''} today. Complete them!`,
      'task'
    );
  }
};

// Send routine reminder notification
export const sendRoutineReminder = () => {
  const summary = getDailySummary();
  const username = getUsername();
  const greeting = username ? `Hyyy ${username}! ` : 'Hey! ';
  
  if (summary.pendingRoutines > 0) {
    showNotification(
      'Routine Reminder',
      `${greeting}${summary.pendingRoutines} routine${summary.pendingRoutines > 1 ? 's are' : ' is'} incomplete. Complete them!`,
      'routine'
    );
  } else if (summary.totalTasks > 0) {
    showNotification(
      'Great Job!',
      `${greeting}All routines completed for today!`,
      'check'
    );
  }
};

// Schedule notifications
let scheduledTimeouts = [];

export const clearScheduledNotifications = () => {
  scheduledTimeouts.forEach(timeout => clearTimeout(timeout));
  scheduledTimeouts = [];
};

export const scheduleNotifications = () => {
  clearScheduledNotifications();
  
  const settings = getNotificationSettings();
  
  if (!settings.enabled || Notification.permission !== 'granted') {
    console.log('Notifications not enabled or permission not granted');
    saveNotificationSchedule([]); // Clear schedule
    return;
  }

  const now = new Date();
  const today = getTodayDate();
  const schedule = []; // Store for service worker
  
  console.log('Scheduling notifications for today:', today);
  
  // Schedule task-specific notifications
  const tasks = taskStorage.getAll();
  tasks.forEach(task => {
    if (!task.completed && task.notificationTime && (task.createdDate === today || isTaskCarriedOver(task))) {
      const [hours, minutes] = task.notificationTime.split(':');
      const targetTime = new Date();
      targetTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const msUntilTask = targetTime - now;
      console.log(`Task "${task.text}" scheduled for ${task.notificationTime}, in ${msUntilTask}ms`);
      
      // Only schedule if the time hasn't passed today
      if (targetTime > now) {
        // Add to schedule for service worker
        schedule.push({
          id: `task-${task.id}`,
          time: targetTime.getTime(),
          type: 'task',
          title: 'Task Reminder',
          body: `${task.text} - Complete it now!`,
          taskId: task.id
        });
        
        const timeout = setTimeout(() => {
          console.log('Firing notification for task:', task.text);
          const username = getUsername();
          const greeting = username ? `Hyyy ${username}! ` : '';
          showNotification(
            'Task Reminder',
            `${greeting}${task.text} - Complete it now!`,
            'clock'
          );
        }, msUntilTask);
        
        scheduledTimeouts.push(timeout);
      } else {
        console.log(`Task "${task.text}" time already passed (${task.notificationTime})`);
      }
    }
  });
  
  // Schedule routine-specific notifications
  const routines = routineStorage.getAll();
  routines.forEach(routine => {
    if (routine.notificationTime && isDateInRange(today, routine.startDate, routine.endDate)) {
      const progress = getRoutineProgress(routine, today);
      
      // Only schedule if routine has incomplete tasks
      if (progress.completed < progress.total) {
        const [hours, minutes] = routine.notificationTime.split(':');
        const targetTime = new Date();
        targetTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Only schedule if the time hasn't passed today
        if (targetTime > now) {
          const msUntilRoutine = targetTime - now;
          const remaining = progress.total - progress.completed;
          
          // Add to schedule for service worker
          schedule.push({
            id: `routine-${routine.id}`,
            time: targetTime.getTime(),
            type: 'routine',
            title: 'Routine Reminder',
            body: `${routine.name} - ${remaining} task${remaining > 1 ? 's' : ''} remaining. Complete them!`,
            routineId: routine.id
          });
          
          const timeout = setTimeout(() => {
            const username = getUsername();
            const greeting = username ? `Hyyy ${username}! ` : '';
            const remaining = progress.total - progress.completed;
            showNotification(
              'Routine Reminder',
              `${greeting}${routine.name} - ${remaining} task${remaining > 1 ? 's' : ''} remaining. Complete them!`,
              'routine'
            );
          }, msUntilRoutine);
          
          scheduledTimeouts.push(timeout);
        }
      }
    }
  });
  
  // Schedule daily reminder
  if (settings.dailyReminderTime) {
    const [hours, minutes] = settings.dailyReminderTime.split(':');
    const targetTime = new Date();
    targetTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    
    const msUntilDaily = targetTime - now;
    
    // Add to schedule for service worker
    schedule.push({
      id: 'daily-reminder',
      time: targetTime.getTime(),
      type: 'daily',
      title: 'Daily Reminder',
      body: 'Check your tasks for today'
    });
    
    const timeout = setTimeout(() => {
      sendDailyReminder();
      scheduleNotifications(); // Reschedule for next day
    }, msUntilDaily);
    
    scheduledTimeouts.push(timeout);
  }
  
  // Schedule routine reminder
  if (settings.routineRemindersEnabled && settings.routineReminderTime) {
    const [hours, minutes] = settings.routineReminderTime.split(':');
    const targetTime = new Date();
    targetTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    
    const msUntilRoutine = targetTime - now;
    
    // Add to schedule for service worker
    schedule.push({
      id: 'routine-reminder',
      time: targetTime.getTime(),
      type: 'routine-daily',
      title: 'Routine Reminder',
      body: 'Check your routines for today'
    });
    
    const timeout = setTimeout(() => {
      sendRoutineReminder();
      scheduleNotifications(); // Reschedule for next day
    }, msUntilRoutine);
    
    scheduledTimeouts.push(timeout);
  }
  
  // Save schedule to localStorage for service worker to check
  saveNotificationSchedule(schedule);
  console.log('Notification schedule saved:', schedule.length, 'items');
};

// Initialize notifications on app start
export const initializeNotifications = async () => {
  console.log('Initializing notifications...');
  
  // Register Service Worker first for better mobile support
  await registerServiceWorker();
  
  const settings = getNotificationSettings();
  console.log('Notification settings:', settings);
  console.log('Notification permission:', Notification.permission);
  
  if (settings.enabled && Notification.permission === 'granted') {
    // Wait a bit to ensure service worker is fully active
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Scheduling notifications...');
    scheduleNotifications();
    
    // Send schedule to service worker immediately and every minute
    const sendScheduleInterval = setInterval(() => {
      sendScheduleToServiceWorker();
    }, 60000); // Every minute
    
    // Send immediately
    await sendScheduleToServiceWorker();
    
    // Also trigger service worker check every minute via message
    setInterval(() => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CHECK_NOTIFICATIONS'
        });
      }
    }, 60000);
    
    // Listen for visibility change to refresh schedule when app comes back
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        console.log('App became visible, refreshing notification schedule');
        scheduleNotifications();
        await sendScheduleToServiceWorker();
      }
    });
    
    // Keep the page alive for notifications on mobile browsers
    if ('wakeLock' in navigator) {
      try {
        const wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake lock acquired');
        
        // Re-acquire wake lock when page becomes visible again
        document.addEventListener('visibilitychange', async () => {
          if (document.visibilityState === 'visible' && wakeLock.released) {
            try {
              await navigator.wakeLock.request('screen');
              console.log('Wake lock re-acquired');
            } catch (err) {
              console.log('Failed to re-acquire wake lock:', err);
            }
          }
        });
      } catch (err) {
        console.log('Wake Lock not supported or failed:', err);
      }
    }
  } else {
    console.log('Notifications not enabled or permission not granted');
  }
};

// Test notification
export const sendTestNotification = () => {
  console.log('Sending test notification...');
  const username = getUsername();
  const greeting = username ? `Hyyy ${username}! ` : '';
  showNotification(
    'Notifications Enabled',
    `${greeting}You\'ll receive reminders at your scheduled times!`,
    'bell'
  );
};

// Test sound only
export const testNotificationSound = () => {
  console.log('Testing notification sound only...');
  playNotificationSound();
};
