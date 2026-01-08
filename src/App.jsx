import { useState, useEffect, useRef } from 'react';
import './App.css';
import {
  createTask,
  deleteTask,
  toggleTaskCompletion,
  isTaskCarriedOver,
  createRoutine,
  deleteRoutine,
  toggleRoutineTaskCompletion,
  getRoutineProgress,
  getRoutineStreak,
  getDisplayItems,
  getTodayDate,
  formatDisplayDate,
} from './services';

function App() {
  const [items, setItems] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isRoutine, setIsRoutine] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [routineTasks, setRoutineTasks] = useState(['']);
  const inputRef = useRef(null);

  // Load tasks on mount
  useEffect(() => {
    setItems(getDisplayItems());
    setStartDate(getTodayDate());
    // Focus input on load
    inputRef.current?.focus();
  }, []);

  const handleAddTask = (e) => {
    e.preventDefault();
    
    if (isRoutine) {
      // Validate routine
      const validTasks = routineTasks.filter(t => t && t.trim() !== '');
      
      if (!inputValue.trim()) {
        alert('Please enter a routine name in the top field');
        return;
      }
      
      if (validTasks.length === 0) {
        alert('Please add at least one task to the routine (fill in the task fields)');
        return;
      }
      
      if (!startDate) {
        alert('Please select a start date');
        return;
      }
      
      console.log('Creating routine:', {
        name: inputValue.trim(),
        startDate,
        endDate: endDate || null,
        tasks: validTasks
      });
      
      createRoutine(inputValue.trim(), startDate, endDate || null, validTasks);
      setInputValue('');
      setIsRoutine(false);
      setStartDate(getTodayDate());
      setEndDate('');
      setRoutineTasks(['']);
      setItems(getDisplayItems());
    } else {
      // Add one-time task
      if (inputValue.trim()) {
        createTask(inputValue.trim());
        setInputValue('');
        setItems(getDisplayItems());
      }
    }
    
    inputRef.current?.focus();
  };

  const handleToggleTask = (itemId, itemType, taskId = null) => {
    if (itemType === 'routine') {
      toggleRoutineTaskCompletion(itemId, taskId);
    } else {
      toggleTaskCompletion(itemId);
    }
    setItems(getDisplayItems());
  };

  const handleDeleteItem = (itemId, itemType) => {
    if (itemType === 'routine') {
      deleteRoutine(itemId);
    } else {
      deleteTask(itemId);
    }
    setItems(getDisplayItems());
  };
  
  const addRoutineTaskInput = () => {
    setRoutineTasks([...routineTasks, '']);
  };
  
  const removeRoutineTaskInput = (index) => {
    if (routineTasks.length > 1) {
      setRoutineTasks(routineTasks.filter((_, i) => i !== index));
    }
  };
  
  const updateRoutineTask = (index, value) => {
    const updated = [...routineTasks];
    updated[index] = value;
    setRoutineTasks(updated);
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>Today</h1>
          <p className="date">{formatDisplayDate(getTodayDate())}</p>
        </header>

        <form onSubmit={handleAddTask} className="add-task-form">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isRoutine ? "Routine name (e.g., Morning Routine)..." : "What needs to be done?"}
              className="task-input"
              maxLength={200}
            />
            
            <div className="form-controls">
              <label className="recurring-toggle">
                <input
                  type="checkbox"
                  checked={isRoutine}
                  onChange={(e) => {
                    setIsRoutine(e.target.checked);
                    if (e.target.checked && routineTasks.length === 0) {
                      setRoutineTasks(['']);
                    }
                  }}
                />
                <span>Create Routine</span>
              </label>
              
              {isRoutine && (
                <div className="routine-builder">
                  <div className="date-inputs">
                    <div className="date-input-group">
                      <label>From</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="date-input"
                      />
                    </div>
                    <div className="date-input-group">
                      <label>To (optional)</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        className="date-input"
                      />
                    </div>
                  </div>
                  
                  <div className="routine-tasks-builder">
                    <label className="builder-label">Tasks in this routine:</label>
                    {routineTasks.map((task, index) => (
                      <div key={index} className="routine-task-input-row">
                        <input
                          type="text"
                          value={task}
                          onChange={(e) => updateRoutineTask(index, e.target.value)}
                          placeholder={`Task ${index + 1}...`}
                          className="routine-task-input"
                          maxLength={200}
                        />
                        {routineTasks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRoutineTaskInput(index)}
                            className="remove-task-btn"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addRoutineTaskInput}
                      className="add-task-btn"
                    >
                      + Add Task
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <button type="submit" className="add-button">
            {isRoutine ? 'Create Routine' : 'Add'}
          </button>
        </form>

        <div className="tasks-container">
          {items.length === 0 ? (
            <div className="empty-state">
              <p>No tasks yet. Add one above to get started.</p>
            </div>
          ) : (
            <ul className="task-list">
              {items.map((item) => 
                item.type === 'routine' ? (
                  <li key={item.id} className="routine-item">
                    <div className="routine-header">
                      <div className="routine-title-section">
                        <span className="routine-name">{item.name}</span>
                        <span className="routine-badge">
                          🔄 Routine
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id, 'routine')}
                        className="delete-button"
                        aria-label="Delete routine"
                      >
                        ×
                      </button>
                    </div>
                    
                    <div className="routine-info-bar">
                      <span className="routine-dates">
                        {formatDisplayDate(item.startDate)} 
                        {item.endDate && ` - ${formatDisplayDate(item.endDate)}`}
                      </span>
                      <span className="routine-progress">
                        {getRoutineProgress(item).completed}/{getRoutineProgress(item).total} completed
                      </span>
                      {getRoutineStreak(item) > 0 && (
                        <span className="streak">
                          🔥 {getRoutineStreak(item)} day streak
                        </span>
                      )}
                    </div>
                    
                    <ul className="routine-tasks-list">
                      {item.tasks.map((task) => (
                        <li key={task.id} className={`routine-task ${task.completed ? 'completed' : ''}`}>
                          <label className="checkbox-container">
                            <input
                              type="checkbox"
                              checked={task.completed || false}
                              onChange={() => handleToggleTask(item.id, 'routine', task.id)}
                            />
                            <span className="checkmark"></span>
                          </label>
                          <span className="task-text">{task.text}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : (
                  <li key={item.id} className={`task-item ${item.completed ? 'completed' : ''}`}>
                    <div className="task-content">
                      <label className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleTask(item.id, 'task')}
                        />
                        <span className="checkmark"></span>
                      </label>
                      <div className="task-text-container">
                        <span className="task-text">{item.text}</span>
                        {isTaskCarriedOver(item) && (
                          <span className="carried-over-tag">
                            From {formatDisplayDate(item.createdDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteItem(item.id, 'task')}
                      className="delete-button"
                      aria-label="Delete task"
                    >
                      ×
                    </button>
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
