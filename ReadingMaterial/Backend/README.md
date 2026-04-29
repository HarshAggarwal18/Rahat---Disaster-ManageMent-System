# Disaster Response Management System - Backend API

RESTful API backend for the Disaster Response Management System built with Node.js, Express, and MongoDB.

## Features

- 🔐 JWT-based authentication
- 👥 User management (Admin, Volunteer, User roles)
- 🚨 Incident reporting and management
- ✅ Incident verification system
- 🎯 Task assignment for volunteers
- 📊 Admin dashboard statistics
- 🔒 Role-based access control

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - `PORT` - Server port (default: 5000)
   - `MONGODB_URI` - MongoDB connection string (default: `mongodb://localhost:27017/Disaster`)
   - `JWT_SECRET` - Secret key for JWT tokens
   - `JWT_EXPIRE` - Token expiration time

3. **Start MongoDB:**
   - Local: Make sure MongoDB is running on your machine
   - Atlas: Use your MongoDB Atlas connection string

4. **Run the server:**
   ```bash
   # Development mode (with nodemon)
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get single user (Protected)
- `PUT /api/users/:id` - Update user (Protected)
- `DELETE /api/users/:id` - Delete user (Admin only)

### Incidents
- `GET /api/incidents` - Get all incidents (Protected)
- `GET /api/incidents/:id` - Get single incident (Protected)
- `POST /api/incidents` - Create new incident (Protected)
- `PUT /api/incidents/:id` - Update incident (Protected)
- `DELETE /api/incidents/:id` - Delete incident (Protected)

### Volunteers
- `GET /api/volunteers` - Get all volunteers (Protected)
- `GET /api/volunteers/available-tasks` - Get available tasks (Volunteer only)
- `GET /api/volunteers/my-tasks` - Get volunteer's tasks (Volunteer only)
- `POST /api/volunteers/assign-task/:incidentId` - Assign task (Volunteer only)
- `POST /api/volunteers/complete-task/:incidentId` - Complete task (Volunteer only)
- `PUT /api/volunteers/update-location` - Update location (Volunteer only)

### Admin
- `GET /api/admin/stats` - Get dashboard statistics (Admin only)
- `POST /api/admin/verify-incident/:incidentId` - Verify incident (Admin only)
- `POST /api/admin/reject-incident/:incidentId` - Reject incident (Admin only)
- `PUT /api/admin/users/:userId/role` - Update user role (Admin only)
- `PUT /api/admin/users/:userId/status` - Update user status (Admin only)

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Example Requests

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Create Incident
```bash
POST /api/incidents
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "fire",
  "severity": 5,
  "description": "Building fire in downtown",
  "location": {
    "lat": 40.7128,
    "lng": -74.0060
  }
}
```

## Database Models

### User
- firstName, lastName, email, password
- role (admin, volunteer, user)
- status (active, inactive, suspended)
- skills, availability, currentLocation (for volunteers)

### Incident
- id, type, severity, status
- location (lat, lng)
- description, timestamp
- reporter, reporterId
- verified, verifiedBy, verifiedAt
- assignedTo, assignedAt
- resolvedAt

## Error Handling

All errors follow this format:
```json
{
  "success": false,
  "message": "Error message"
}
```

## Development

- Uses Express.js for routing
- Mongoose for MongoDB ODM
- JWT for authentication
- bcryptjs for password hashing
- express-validator for input validation

## License

ISC

