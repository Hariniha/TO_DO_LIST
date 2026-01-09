// Routine Service - Business logic for recurring routines
import { routineStorage } from './storageService.js';
import { getTodayDate, formatDate, isDateInRange } from './dateService.js';

// Create a new routine with multiple tasks
export const createRoutine = (routineName, startDate, endDate, taskTexts, notificationTime = null) => {
  const routines = routineStorage.getAll();
  const newRoutine = {
    id: Date.now().toString(),
    name: routineName,
    startDate: startDate,
    endDate: endDate || null,
    notificationTime: notificationTime, // HH:MM format
    tasks: taskTexts.map((taskText, index) => ({
      id: `${Date.now()}-${index}`,
      text: taskText,
      dailyCompletions: {}, // { "2026-01-08": true, "2026-01-09": false, ... }
    })),
    createdDate: getTodayDate(),
  };
  routines.push(newRoutine);
  routineStorage.save(routines);
  return newRoutine;
};

// Toggle routine task completion for a specific day
export const toggleRoutineTaskCompletion = (routineId, taskId, date = null) => {
  const routines = routineStorage.getAll();
  const routine = routines.find(r => r.id === routineId);
  const today = date || getTodayDate();
  
  if (routine) {
    const task = routine.tasks.find(t => t.id === taskId);
    if (task) {
      if (!task.dailyCompletions) task.dailyCompletions = {};
      task.dailyCompletions[today] = !task.dailyCompletions[today];
      routineStorage.save(routines);
    }
  }
  
  return routines;
};

// Delete a routine
export const deleteRoutine = (routineId) => {
  const routines = routineStorage.getAll();
  const filteredRoutines = routines.filter(r => r.id !== routineId);
  routineStorage.save(filteredRoutines);
  return filteredRoutines;
};

// Get all routines
export const getAllRoutines = () => {
  return routineStorage.getAll();
};

// Get active routines for today
export const getActiveRoutines = (date = null) => {
  const today = date || getTodayDate();
  const routines = routineStorage.getAll();
  
  return routines.filter(routine => 
    isDateInRange(today, routine.startDate, routine.endDate)
  ).map(routine => ({
    ...routine,
    tasks: routine.tasks.map(task => ({
      ...task,
      completed: task.dailyCompletions && task.dailyCompletions[today],
    })),
  }));
};

// Get completion progress for a routine today
export const getRoutineProgress = (routine, date = null) => {
  const today = date || getTodayDate();
  let completed = 0;
  let total = routine.tasks.length;
  
  routine.tasks.forEach(task => {
    if (task.dailyCompletions && task.dailyCompletions[today]) {
      completed++;
    }
  });
  
  return { completed, total };
};

// Get completion streak for a routine (all tasks must be completed each day)
export const getRoutineStreak = (routine) => {
  const today = new Date(getTodayDate() + 'T00:00:00');
  const start = new Date(routine.startDate + 'T00:00:00');
  let streak = 0;
  let currentDate = new Date(today);
  
  // Count backwards from today
  while (currentDate >= start) {
    const dateStr = formatDate(currentDate);
    const allCompleted = routine.tasks.every(task => 
      task.dailyCompletions && task.dailyCompletions[dateStr]
    );
    
    if (allCompleted) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
};

export default {
  createRoutine,
  toggleRoutineTaskCompletion,
  deleteRoutine,
  getAllRoutines,
  getActiveRoutines,
  getRoutineProgress,
  getRoutineStreak,
};
