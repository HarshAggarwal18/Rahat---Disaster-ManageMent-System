# Frontend-Backend Integration Guide

## Overview
The frontend is now fully integrated with the backend API. All data operations use API calls instead of localStorage.

## API Configuration

### Base URL
- Default: `http://localhost:5000/api`
- Can be configured via environment variable: `REACT_APP_API_URL`

### Authentication
- JWT tokens are stored in localStorage under `disaster_response_session`
- Tokens are automatically included in API request headers
- Format: `Authorization: Bearer <token>`

## Components Updated

### ✅ Auth.js
- **Login**: Uses `authAPI.login()` - sends credentials to backend
- **Signup**: Uses `authAPI.register()` - creates user in database
- **Session**: Stores JWT token and user data in localStorage

### ✅ Dashboard.js
- **Load Data**: Uses `incidentsAPI.getAll()` and `usersAPI.getAll()`
- **Real-time**: Fetches incidents from database on component mount
- **Stats**: Calculated from API data

### ✅ UserDashboard.js
- **Load Incidents**: Uses `incidentsAPI.getAll()`
- **Report Incident**: Uses `incidentsAPI.create()` - saves to database
- **Map**: Displays all incidents from database

### ✅ Incidents.js
- **Load Incidents**: Uses `incidentsAPI.getAll()`
- **Update Status**: Uses `incidentsAPI.update()`
- **Assign Incident**: Uses `incidentsAPI.update()`

### ✅ Volunteers.js
- **Load Incidents**: Uses `incidentsAPI.getAll()`
- **Assign Task**: Uses `volunteersAPI.assignTask()`
- **Complete Task**: Uses `volunteersAPI.completeTask()`
- **Update Location**: Uses `volunteersAPI.updateLocation()`

### ✅ Admin.js
- **Load Data**: Uses `incidentsAPI.getAll()` and `usersAPI.getAll()`
- **Verify Incident**: Uses `adminAPI.verifyIncident()`
- **Reject Incident**: Uses `adminAPI.rejectIncident()`

## Data Flow

### Create Operations
1. User submits form in frontend
2. Frontend calls API (e.g., `incidentsAPI.create()`)
3. API validates and saves to MongoDB
4. Frontend reloads data to show updates

### Read Operations
1. Component mounts or data refresh needed
2. Frontend calls API (e.g., `incidentsAPI.getAll()`)
3. API queries MongoDB and returns data
4. Frontend updates state and UI

### Update Operations
1. User triggers update (e.g., verify incident)
2. Frontend calls API (e.g., `adminAPI.verifyIncident()`)
3. API updates MongoDB
4. Frontend reloads data to show updates

### Delete Operations
1. User triggers delete
2. Frontend calls API (e.g., `adminAPI.rejectIncident()`)
3. API deletes from MongoDB
4. Frontend reloads data to show updates

## API Service (`Frontend/src/utils/api.js`)

All API calls are centralized in this file:
- `authAPI`: Authentication (login, register, getMe)
- `usersAPI`: User management (getAll, getById, update, delete)
- `incidentsAPI`: Incident management (getAll, getById, create, update, delete)
- `volunteersAPI`: Volunteer operations (assignTask, completeTask, updateLocation)
- `adminAPI`: Admin operations (verifyIncident, rejectIncident, getStats)

## Error Handling

All API calls include try-catch blocks:
- Errors are logged to console
- User-friendly error messages shown via notifications
- Failed operations don't crash the app

## Testing the Integration

1. **Start Backend:**
   ```bash
   cd Backend
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd Frontend
   npm start
   ```

3. **Test Flow:**
   - Register a new user → Check MongoDB for new user
   - Login → Verify JWT token is stored
   - Report incident → Check MongoDB for new incident
   - Verify incident (as admin) → Check MongoDB for updated status
   - Assign task (as volunteer) → Check MongoDB for updated assignment

## Troubleshooting

### Backend Not Responding
- Check if backend is running on port 5000
- Verify MongoDB is running
- Check CORS settings in backend

### Authentication Errors
- Verify JWT token is being sent in headers
- Check token expiration
- Verify user exists in database

### Data Not Updating
- Check browser console for API errors
- Verify API endpoints are correct
- Check network tab for failed requests
- Ensure backend is connected to MongoDB

## Migration from localStorage

All localStorage data operations have been replaced with API calls:
- ✅ `getIncidents()` → `incidentsAPI.getAll()`
- ✅ `saveIncidents()` → `incidentsAPI.create()` / `incidentsAPI.update()`
- ✅ `getUsers()` → `usersAPI.getAll()`
- ✅ `saveUsers()` → `usersAPI.update()`

Legacy functions still exist for backward compatibility but log warnings.

