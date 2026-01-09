import { taskStorage, routineStorage } from './storageService.js';
import { getTodayDate, isDateInRange } from './dateService.js';
import { isTaskCarriedOver } from './taskService.js';
import { getRoutineProgress } from './routineService.js';

// Notification settings storage
const SETTINGS_KEY = 'daily_todo_notification_settings';

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
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered successfully:', registration);
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('Service Worker is ready');
      
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
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Register service worker after permission granted
        await registerServiceWorker();
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

// Helper function to play the actual beep sounds
const playBeeps = (audioContext) => {
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Higher frequency and louder volume for better audibility
    oscillator.frequency.value = 1000; // Frequency in Hz (higher pitch)
    oscillator.type = 'sine';
    
    // Louder volume
    gainNode.gain.setValueAtTime(0.7, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    console.log('First beep played');
    
    // Add a second beep for double notification sound
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 1200;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.7, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.2);
      console.log('Second beep played');
    }, 150);
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
  
  if (summary.totalTasks === 0) {
    showNotification(
      'Daily Todo',
      'No tasks for today. Start fresh!',
      'task'
    );
  } else if (summary.pendingTasks === 0) {
    showNotification(
      'All Done!',
      'You\'ve completed all your tasks for today!',
      'check'
    );
  } else {
    showNotification(
      'Daily Reminder',
      `You have ${summary.pendingTasks} pending task${summary.pendingTasks > 1 ? 's' : ''} today`,
      'task'
    );
  }
};

// Send routine reminder notification
export const sendRoutineReminder = () => {
  const summary = getDailySummary();
  
  if (summary.pendingRoutines > 0) {
    showNotification(
      'Routine Reminder',
      `${summary.pendingRoutines} routine${summary.pendingRoutines > 1 ? 's are' : ' is'} incomplete today`,
      'routine'
    );
  } else if (summary.totalTasks > 0) {
    showNotification(
      'Great Job!',
      'All routines completed for today!',
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
    return;
  }

  const now = new Date();
  const today = getTodayDate();
  
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
        const timeout = setTimeout(() => {
          console.log('Firing notification for task:', task.text);
          showNotification(
            'Task Reminder',
            task.text,
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
          const timeout = setTimeout(() => {
            showNotification(
              'Routine Reminder',
              `${routine.name}: ${progress.completed}/${progress.total} completed`,
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
    const timeout = setTimeout(() => {
      sendRoutineReminder();
      scheduleNotifications(); // Reschedule for next day
    }, msUntilRoutine);
    
    scheduledTimeouts.push(timeout);
  }
};

// Initialize notifications on app start
export const initializeNotifications = async () => {
  // Register Service Worker first for better mobile support
  await registerServiceWorker();
  
  const settings = getNotificationSettings();
  
  if (settings.enabled && Notification.permission === 'granted') {
    scheduleNotifications();
    
    // Keep the page alive for notifications on mobile browsers
    if ('wakeLock' in navigator) {
      try {
        navigator.wakeLock.request('screen').catch((err) => {
          console.log('Wake Lock not supported:', err);
        });
      } catch (err) {
        console.log('Wake Lock error:', err);
      }
    }
  }
};

// Test notification
export const sendTestNotification = () => {
  console.log('Sending test notification...');
  showNotification(
    'Notifications Enabled',
    'You\'ll receive reminders at your scheduled times',
    'bell'
  );
};

// Test sound only
export const testNotificationSound = () => {
  console.log('Testing notification sound only...');
  playNotificationSound();
};
