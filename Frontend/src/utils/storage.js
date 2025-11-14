// Utility functions for localStorage management

export const getSession = () => {
  const session = localStorage.getItem('disaster_response_session');
  return session ? JSON.parse(session) : null;
};

export const setSession = (user) => {
  localStorage.setItem('disaster_response_session', JSON.stringify({
    ...user,
    loginTime: new Date().toISOString()
  }));
};

export const clearSession = () => {
  localStorage.removeItem('disaster_response_session');
};

export const getIncidents = () => {
  const incidents = localStorage.getItem('disaster_response_incidents');
  return incidents ? JSON.parse(incidents) : [];
};

export const saveIncidents = (incidents) => {
  localStorage.setItem('disaster_response_incidents', JSON.stringify(incidents));
};

export const getUsers = () => {
  const users = localStorage.getItem('disaster_response_users');
  return users ? JSON.parse(users) : [];
};

export const saveUsers = (users) => {
  localStorage.setItem('disaster_response_users', JSON.stringify(users));
};

export const getVolunteers = () => {
  const volunteers = localStorage.getItem('disaster_response_volunteers');
  return volunteers ? JSON.parse(volunteers) : [];
};

export const saveVolunteers = (volunteers) => {
  localStorage.setItem('disaster_response_volunteers', JSON.stringify(volunteers));
};

export const initializeDemoData = () => {
  if (!localStorage.getItem('disaster_response_users')) {
    const demoUsers = [
      {
        id: 'USER-demo-admin',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@demo.com',
        password: 'demo123',
        role: 'admin',
        signupDate: new Date().toISOString()
      },
      {
        id: 'USER-demo-volunteer',
        firstName: 'Volunteer',
        lastName: 'User',
        email: 'volunteer@demo.com',
        password: 'demo123',
        role: 'volunteer',
        signupDate: new Date().toISOString()
      },
      {
        id: 'USER-demo-user',
        firstName: 'Regular',
        lastName: 'User',
        email: 'user@demo.com',
        password: 'demo123',
        role: 'user',
        signupDate: new Date().toISOString()
      }
    ];
    localStorage.setItem('disaster_response_users', JSON.stringify(demoUsers));
  }

  if (!localStorage.getItem('disaster_response_incidents')) {
    const demoIncidents = [
      {
        id: 'INC-2025-001',
        type: 'fire',
        severity: 5,
        status: 'unverified',
        location: { lat: 40.7589, lng: -73.9851 },
        description: 'High-rise building fire in Manhattan',
        timestamp: new Date(),
        reporter: 'John Smith',
        reporterId: 'USER-demo-user',
        assignedVolunteers: [],
        resources: [],
        resolvedAt: null,
        assignedTo: null,
        verified: false
      },
      {
        id: 'INC-2025-002',
        type: 'medical',
        severity: 3,
        status: 'available',
        location: { lat: 40.7505, lng: -73.9934 },
        description: 'Cardiac emergency at subway station',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        reporter: 'Jane Doe',
        reporterId: 'USER-demo-user',
        assignedVolunteers: [],
        resources: [],
        resolvedAt: null,
        assignedTo: null,
        verified: true
      }
    ];
    localStorage.setItem('disaster_response_incidents', JSON.stringify(demoIncidents));
  }

  if (!localStorage.getItem('disaster_response_volunteers')) {
    const demoVolunteers = [
      {
        id: 'USER-demo-volunteer',
        name: 'Volunteer User',
        skills: ['First Aid', 'Fire Response'],
        availability: true,
        location: { lat: 40.7500, lng: -73.9900 },
        contact: 'volunteer@demo.com',
        assignedTasks: [],
        hoursLogged: 0,
        status: 'active',
        currentLocation: { lat: 40.7500, lng: -73.9900 }
      }
    ];
    localStorage.setItem('disaster_response_volunteers', JSON.stringify(demoVolunteers));
  }
};


