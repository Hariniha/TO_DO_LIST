// Display Service - Business logic for displaying tasks and routines
import { getAllTasks, isTaskCarriedOver } from './taskService.js';
import { getActiveRoutines } from './routineService.js';
import { getTodayDate } from './dateService.js';

// Get all items for display (today's tasks + carried over incomplete tasks + active routines)
export const getDisplayItems = () => {
  const tasks = getAllTasks();
  const routines = getActiveRoutines();
  const today = getTodayDate();
  
  const displayItems = [];
  
  // Add active routines
  routines.forEach(routine => {
    displayItems.push({
      ...routine,
      type: 'routine',
    });
  });
  
  // Add one-time tasks: incomplete or completed today
  tasks.forEach(task => {
    if (!task.completed || task.completedDate === today) {
      displayItems.push({
        ...task,
        type: 'task',
      });
    }
  });
  
  // Sort: routines first, then incomplete tasks, then by creation date
  return displayItems.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'routine' ? -1 : 1;
    }
    if (a.type === 'task' && a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return new Date(b.createdDate) - new Date(a.createdDate);
  });
};

export default {
  getDisplayItems,
  isTaskCarriedOver,
};
