// Task Service - Business logic for one-time tasks
import { taskStorage } from './storageService.js';
import { getTodayDate } from './dateService.js';

// Create a new one-time task
export const createTask = (taskText, notificationTime = null) => {
  const tasks = taskStorage.getAll();
  const newTask = {
    id: Date.now().toString(),
    text: taskText,
    createdDate: getTodayDate(),
    completed: false,
    completedDate: null,
    notificationTime: notificationTime, // HH:MM format
  };
  tasks.push(newTask);
  taskStorage.save(tasks);
  return newTask;
};

// Toggle task completion
export const toggleTaskCompletion = (taskId) => {
  const tasks = taskStorage.getAll();
  const task = tasks.find(t => t.id === taskId);
  
  if (task) {
    task.completed = !task.completed;
    task.completedDate = task.completed ? getTodayDate() : null;
    taskStorage.save(tasks);
  }
  
  return tasks;
};

// Delete a task
export const deleteTask = (taskId) => {
  const tasks = taskStorage.getAll();
  const filteredTasks = tasks.filter(t => t.id !== taskId);
  taskStorage.save(filteredTasks);
  return filteredTasks;
};

// Get all tasks
export const getAllTasks = () => {
  return taskStorage.getAll();
};

// Check if a task is carried over from a previous day
export const isTaskCarriedOver = (task) => {
  const today = getTodayDate();
  return !task.completed && task.createdDate !== today;
};

export default {
  createTask,
  toggleTaskCompletion,
  deleteTask,
  getAllTasks,
  isTaskCarriedOver,
};
