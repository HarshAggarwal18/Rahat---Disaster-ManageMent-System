// Formatting utility functions

export const formatTime = (timestamp) => {
  const now = new Date();
  const diff = now - new Date(timestamp);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
};

export const getSeverityText = (severity) => {
  const texts = {
    1: 'Low',
    2: 'Medium',
    3: 'High',
    4: 'Critical',
    5: 'Emergency'
  };
  return texts[severity] || 'Medium';
};

export const getSeverityColor = (severity) => {
  const colors = {
    1: '#27ae60',
    2: '#f39c12',
    3: '#e67e22',
    4: '#e74c3c',
    5: '#8e44ad'
  };
  return colors[severity] || '#f39c12';
};

export const getSeverityColorClass = (severity) => {
  const classes = {
    1: 'bg-green-500',
    2: 'bg-yellow-500',
    3: 'bg-orange-500',
    4: 'bg-red-500',
    5: 'bg-purple-500'
  };
  return classes[severity] || 'bg-yellow-500';
};

export const generateUserId = () => {
  return 'USER-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const generateIncidentId = () => {
  return `INC-${Date.now()}`;
};


