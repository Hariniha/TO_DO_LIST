import { useState, useEffect, useRef } from 'react';
import './App.css';
import {
  RoutineIcon,
  ClockIcon,
  FireIcon,
  TrashIcon,
  EditIcon,
  BellIcon,
  VolumeIcon,
  HelpIcon,
} from './components/Icons';
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
  getNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermission,
  initializeNotifications,
  scheduleNotifications,
  sendTestNotification,
  testNotificationSound,
} from './services';

function App() {
  const [items, setItems] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isRoutine, setIsRoutine] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [routineTasks, setRoutineTasks] = useState(['']);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState(getNotificationSettings());
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [taskNotificationTime, setTaskNotificationTime] = useState('');
  const [routineNotificationTime, setRoutineNotificationTime] = useState('');
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const inputRef = useRef(null);
  const usernameInputRef = useRef(null);

  // Load username and tasks on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('daily_todo_username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
    setItems(getDisplayItems());
    setStartDate(getTodayDate());
    initializeNotifications();
    inputRef.current?.focus();
  }, []);

  const handleSaveUsername = (e) => {
    e.preventDefault();
    const name = tempUsername.trim();
    if (name) {
      localStorage.setItem('daily_todo_username', name);
      setUsername(name);
      setIsEditingUsername(false);
      setTempUsername('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleEditUsername = () => {
    setTempUsername(username);
    setIsEditingUsername(true);
    setTimeout(() => usernameInputRef.current?.focus(), 50);
  };

  const handleCancelInlineEdit = () => {
    setIsEditingUsername(false);
    setTempUsername('');
  };

  const handleUsernameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveUsername(e);
    } else if (e.key === 'Escape') {
      handleCancelInlineEdit();
    }
  };

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
        tasks: validTasks,
        notificationTime: routineNotificationTime || null
      });
      
      createRoutine(inputValue.trim(), startDate, endDate || null, validTasks, routineNotificationTime || null);
      setInputValue('');
      setIsRoutine(false);
      setStartDate(getTodayDate());
      setEndDate('');
      setRoutineTasks(['']);
      setRoutineNotificationTime('');
      setItems(getDisplayItems());
      scheduleNotifications(); // Reschedule notifications after adding routine
    } else {
      // Add one-time task
      if (inputValue.trim()) {
        createTask(inputValue.trim(), taskNotificationTime || null);
        setInputValue('');
        setTaskNotificationTime('');
        setItems(getDisplayItems());
        scheduleNotifications(); // Reschedule notifications after adding task
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
    scheduleNotifications(); // Reschedule after task state change
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

  const handleToggleNotifications = async () => {
    if (!notificationSettings.enabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        const newSettings = { ...notificationSettings, enabled: true };
        setNotificationSettings(newSettings);
        saveNotificationSettings(newSettings);
        scheduleNotifications();
        sendTestNotification();
      } else {
        alert('Please allow notifications in your browser settings');
      }
    } else {
      const newSettings = { ...notificationSettings, enabled: false };
      setNotificationSettings(newSettings);
      saveNotificationSettings(newSettings);
      scheduleNotifications();
    }
  };

  const handleNotificationSettingChange = (field, value) => {
    const newSettings = { ...notificationSettings, [field]: value };
    setNotificationSettings(newSettings);
    saveNotificationSettings(newSettings);
    if (notificationSettings.enabled) {
      scheduleNotifications();
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="header-left">
            <div className="user-greeting">
              {isEditingUsername ? (
                <div className="inline-name-edit">
                  <span className="hello-text">Hello,</span>
                  <input
                    ref={usernameInputRef}
                    type="text"
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    onBlur={handleSaveUsername}
                    onKeyDown={handleUsernameKeyDown}
                    className="inline-username-input"
                    maxLength={50}
                  />
                </div>
              ) : (
                <>
                  <h1>Hello{username ? `, ${username}` : ''}</h1>
                  <button onClick={handleEditUsername} className="edit-name-btn" title={username ? "Edit your name" : "Add your name"}>
                    <EditIcon />
                  </button>
                </>
              )}
            </div>
            <p className="date">{formatDisplayDate(getTodayDate())}</p>
          </div>
          <div className="header-actions">
            <button
              onClick={() => setShowHelpMenu(!showHelpMenu)}
              className="help-menu-toggle"
              title="How to Use"
            >
              <HelpIcon />
            </button>
            <button
              onClick={() => setShowNotificationSettings(!showNotificationSettings)}
              className="notification-settings-toggle"
              title="Notification Settings"
            >
              <BellIcon />
            </button>
          </div>
        </header>

        {showHelpMenu && (
          <div className="help-menu">
            <div className="help-menu-header">
              <h3>How to Use This App</h3>
              <button onClick={() => setShowHelpMenu(false)} className="help-menu-close">
                ×
              </button>
            </div>
            <div className="help-menu-content">
              <div className="help-section">
                <h4><ClockIcon className="help-icon" /> Create Tasks</h4>
                <ul>
                  <li>Type your task in the input field</li>
                  <li>Optionally set a reminder time</li>
                  <li>Click "Add" to save</li>
                  <li>Check off tasks when complete</li>
                </ul>
              </div>
              
              <div className="help-section">
                <h4><RoutineIcon className="help-icon" /> Create Routines</h4>
                <ul>
                  <li>Toggle "Make this a routine" checkbox</li>
                  <li>Set start and end dates</li>
                  <li>Add multiple tasks for your routine</li>
                  <li>Set a daily reminder time (optional)</li>
                  <li>Tasks repeat daily within the date range</li>
                </ul>
              </div>
              
              <div className="help-section">
                <h4><BellIcon className="help-icon" /> Enable Notifications</h4>
                <ul>
                  <li>Click the bell icon to open settings</li>
                  <li>Enable notifications and grant permission</li>
                  <li>Set daily reminder time (default 9:00 AM)</li>
                  <li>Enable routine reminders (default 8:00 PM)</li>
                  <li>Test notifications with the bell icon</li>
                </ul>
              </div>
              
              <div className="help-section">
                <h4><FireIcon className="help-icon" /> Track Progress</h4>
                <ul>
                  <li>See completion counts for routines</li>
                  <li>Build streaks by completing routines daily</li>
                  <li>Incomplete tasks carry over to next day</li>
                  <li>View task creation dates</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {showNotificationSettings && (
          <div className="notification-settings">
            <h3>Notification Settings</h3>
            
            <div className="setting-row">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={notificationSettings.enabled}
                  onChange={handleToggleNotifications}
                />
                <span>Enable Notifications</span>
              </label>
            </div>

            {notificationSettings.enabled && (
              <>
                <div className="setting-row">
                  <label className="setting-label">
                    Daily Reminder Time
                    <input
                      type="time"
                      value={notificationSettings.dailyReminderTime}
                      onChange={(e) => handleNotificationSettingChange('dailyReminderTime', e.target.value)}
                      className="time-input"
                    />
                  </label>
                  <span className="setting-description">Get a summary of pending tasks</span>
                </div>

                <div className="setting-row">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={notificationSettings.routineRemindersEnabled}
                      onChange={(e) => handleNotificationSettingChange('routineRemindersEnabled', e.target.checked)}
                    />
                    <span>Routine Reminders</span>
                  </label>
                </div>

                {notificationSettings.routineRemindersEnabled && (
                  <div className="setting-row">
                    <label className="setting-label">
                      Routine Reminder Time
                      <input
                        type="time"
                        value={notificationSettings.routineReminderTime}
                        onChange={(e) => handleNotificationSettingChange('routineReminderTime', e.target.value)}
                        className="time-input"
                      />
                    </label>
                    <span className="setting-description">Check incomplete routines</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

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
              {!isRoutine && (
                <div className="task-notification-time">
                  <label className="time-label">
                    Remind me at:
                    <input
                      type="time"
                      value={taskNotificationTime}
                      onChange={(e) => setTaskNotificationTime(e.target.value)}
                      className="task-time-input"
                    />
                  </label>
                  <button 
                    type="button" 
                    className="test-sound-btn"
                    onClick={() => testNotificationSound()}
                    title="Test notification sound"
                  >
                    <VolumeIcon />
                  </button>
                </div>
              )}
              
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
                    <div className="date-input-group">
                      <label>Remind at</label>
                      <input
                        type="time"
                        value={routineNotificationTime}
                        onChange={(e) => setRoutineNotificationTime(e.target.value)}
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
                          <RoutineIcon className="badge-icon" />
                          Routine
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id, 'routine')}
                        className="delete-button"
                        aria-label="Delete routine"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                    
                    <div className="routine-info-bar">
                      <span className="routine-dates">
                        {formatDisplayDate(item.startDate)} 
                        {item.endDate && ` - ${formatDisplayDate(item.endDate)}`}
                      </span>
                      {item.notificationTime && (
                        <span className="notification-time-badge">
                          <ClockIcon className="badge-icon" />
                          {item.notificationTime}
                        </span>
                      )}
                      <span className="routine-progress">
                        {getRoutineProgress(item).completed}/{getRoutineProgress(item).total} completed
                      </span>
                      {getRoutineStreak(item) > 0 && (
                        <span className="streak">
                          <FireIcon className="badge-icon" />
                          {getRoutineStreak(item)} day streak
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
                        {item.notificationTime && (
                          <span className="notification-time-badge">
                            <ClockIcon className="badge-icon" />
                            {item.notificationTime}
                          </span>
                        )}
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
                      <TrashIcon />
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
