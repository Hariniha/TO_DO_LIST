// Date Service - Handles all date-related operations

// Format: YYYY-MM-DD
export const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayDate = () => formatDate(new Date());

export const isDateInRange = (date, startDate, endDate) => {
  const dateObj = new Date(date + 'T00:00:00');
  const start = new Date(startDate + 'T00:00:00');
  const end = endDate ? new Date(endDate + 'T00:00:00') : null;
  
  return dateObj >= start && (!end || dateObj <= end);
};

export const formatDisplayDate = (dateString) => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

export default {
  formatDate,
  getTodayDate,
  isDateInRange,
  formatDisplayDate,
};
