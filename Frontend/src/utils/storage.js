// Utility functions for session management (localStorage for token)
// All data operations now use API calls

export const getSession = () => {
  const session = localStorage.getItem('disaster_response_session');
  return session ? JSON.parse(session) : null;
};

export const setSession = (user, token) => {
  localStorage.setItem('disaster_response_session', JSON.stringify({
    ...user,
    token,
    loginTime: new Date().toISOString()
  }));
};

export const clearSession = () => {
  localStorage.removeItem('disaster_response_session');
};

// Legacy functions for backward compatibility - now use API
// These are kept for components that might still reference them
export const getIncidents = () => {
  // This is now handled by API calls in components
  return [];
};

export const saveIncidents = (incidents) => {
  // This is now handled by API calls in components
  console.warn('saveIncidents: Use API calls instead');
};

export const getUsers = () => {
  // This is now handled by API calls in components
  return [];
};

export const saveUsers = (users) => {
  // This is now handled by API calls in components
  console.warn('saveUsers: Use API calls instead');
};

export const getVolunteers = () => {
  // This is now handled by API calls in components
  return [];
};

export const saveVolunteers = (volunteers) => {
  // This is now handled by API calls in components
  console.warn('saveVolunteers: Use API calls instead');
};

export const initializeDemoData = () => {
  // No longer needed - data comes from backend
  // This function is kept for compatibility but does nothing
};


