// Storage Service - Handles all localStorage operations
const STORAGE_KEYS = {
  TASKS: 'daily_todo_tasks',
  ROUTINES: 'daily_todo_routines',
};

// Generic storage functions
const getItem = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error getting ${key} from storage:`, error);
    return null;
  }
};

const setItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
    return false;
  }
};

const removeItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing ${key} from storage:`, error);
    return false;
  }
};

// Task storage operations
export const taskStorage = {
  getAll: () => getItem(STORAGE_KEYS.TASKS) || [],
  save: (tasks) => setItem(STORAGE_KEYS.TASKS, tasks),
  clear: () => removeItem(STORAGE_KEYS.TASKS),
};

// Routine storage operations
export const routineStorage = {
  getAll: () => getItem(STORAGE_KEYS.ROUTINES) || [],
  save: (routines) => setItem(STORAGE_KEYS.ROUTINES, routines),
  clear: () => removeItem(STORAGE_KEYS.ROUTINES),
};

export default {
  taskStorage,
  routineStorage,
};
