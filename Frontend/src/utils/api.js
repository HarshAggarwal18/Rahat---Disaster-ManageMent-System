// API service for backend communication

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
const getToken = () => {
  const session = localStorage.getItem('disaster_response_session');
  if (session) {
    const parsed = JSON.parse(session);
    return parsed.token;
  }
  return null;
};

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    console.log(`API Request: ${options.method || 'GET'} ${API_BASE_URL}${endpoint}`, options.body ? JSON.parse(options.body) : '');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Check if response has content
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error('Invalid response format from server');
    }

    console.log(`API Response:`, data);

    if (!response.ok) {
      const errorMessage = data.message || data.error || `API request failed with status ${response.status}`;
      console.error('API Error Response:', errorMessage, data);
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    if (error.message) {
      throw error;
    }
    throw new Error(error.message || 'Network error. Please check your connection.');
  }
};

// Auth API
export const authAPI = {
  register: async (userData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  login: async (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getMe: async () => {
    return apiRequest('/auth/me');
  },
};

// Users API
export const usersAPI = {
  getAll: async () => {
    return apiRequest('/users');
  },

  getById: async (id) => {
    return apiRequest(`/users/${id}`);
  },

  update: async (id, data) => {
    return apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiRequest(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// Incidents API
export const incidentsAPI = {
  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.verified !== undefined) queryParams.append('verified', filters.verified);
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.severity) queryParams.append('severity', filters.severity);
    
    const queryString = queryParams.toString();
    return apiRequest(`/incidents${queryString ? `?${queryString}` : ''}`);
  },

  getById: async (id) => {
    return apiRequest(`/incidents/${id}`);
  },

  create: async (incidentData) => {
    return apiRequest('/incidents', {
      method: 'POST',
      body: JSON.stringify(incidentData),
    });
  },

  update: async (id, data) => {
    return apiRequest(`/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiRequest(`/incidents/${id}`, {
      method: 'DELETE',
    });
  },
};

// Volunteers API
export const volunteersAPI = {
  getAll: async () => {
    return apiRequest('/volunteers');
  },

  getAvailableTasks: async () => {
    return apiRequest('/volunteers/available-tasks');
  },

  getMyTasks: async () => {
    return apiRequest('/volunteers/my-tasks');
  },

  assignTask: async (incidentId) => {
    return apiRequest(`/volunteers/assign-task/${incidentId}`, {
      method: 'POST',
    });
  },

  completeTask: async (incidentId) => {
    return apiRequest(`/volunteers/complete-task/${incidentId}`, {
      method: 'POST',
    });
  },

  unassignTask: async (incidentId) => {
    return apiRequest(`/volunteers/unassign-task/${incidentId}`, {
      method: 'POST',
    });
  },

  updateLocation: async (location) => {
    return apiRequest('/volunteers/update-location', {
      method: 'PUT',
      body: JSON.stringify(location),
    });
  },
};

// Admin API
export const adminAPI = {
  getStats: async () => {
    return apiRequest('/admin/stats');
  },

  verifyIncident: async (incidentId) => {
    return apiRequest(`/admin/verify-incident/${incidentId}`, {
      method: 'POST',
    });
  },

  rejectIncident: async (incidentId) => {
    return apiRequest(`/admin/reject-incident/${incidentId}`, {
      method: 'POST',
    });
  },

  updateUserRole: async (userId, role) => {
    return apiRequest(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  updateUserStatus: async (userId, status) => {
    return apiRequest(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  assignIncidentToVolunteer: async (incidentId, volunteerId) => {
    return apiRequest(`/admin/assign-incident/${incidentId}`, {
      method: 'POST',
      body: JSON.stringify({ volunteerId }),
    });
  },

  updateVolunteerLocation: async (volunteerId, location) => {
    return apiRequest(`/admin/volunteers/${volunteerId}/location`, {
      method: 'PUT',
      body: JSON.stringify(location),
    });
  },
};

export default {
  auth: authAPI,
  users: usersAPI,
  incidents: incidentsAPI,
  volunteers: volunteersAPI,
  admin: adminAPI,
};

