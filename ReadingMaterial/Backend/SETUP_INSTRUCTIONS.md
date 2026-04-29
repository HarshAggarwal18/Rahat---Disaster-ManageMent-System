# Backend Setup Instructions

## MongoDB Configuration

The backend is configured to use:
- **URI**: `mongodb://localhost:27017/Disaster`
- **Database Name**: `Disaster`

## Quick Setup

### 1. Install MongoDB
- Download from: https://www.mongodb.com/try/download/community
- Install and start MongoDB service
- Default port: 27017

### 2. Install Dependencies
```bash
cd Backend
npm install
```

### 3. Configure Environment
The `.env` file is already configured with:
```
MONGODB_URI=mongodb://localhost:27017/Disaster
PORT=5000
JWT_SECRET=disaster_response_super_secret_key_change_in_production_2025
```

### 4. Seed Database (Optional)
```bash
npm run seed
```
This creates demo users:
- Admin: admin@demo.com / demo123
- Volunteer: volunteer@demo.com / demo123
- User: user@demo.com / demo123

### 5. Test CRUD Operations
```bash
npm run test-crud
```
This verifies all CREATE, READ, UPDATE, DELETE operations work correctly.

### 6. Start Server
```bash
npm run dev
```

Server will run on: `http://localhost:5000`

## Verify MongoDB Connection

### Check if MongoDB is Running
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl status mongod
# or
brew services list
```

### Connect to MongoDB
```bash
mongosh mongodb://localhost:27017/Disaster
```

### Check Collections
```javascript
show collections
db.users.find().count()
db.incidents.find().count()
```

## All CRUD Operations Status

✅ **User CRUD**: Fully implemented and tested
✅ **Incident CRUD**: Fully implemented and tested
✅ **Volunteer Operations**: Fully implemented and tested
✅ **Admin Operations**: Fully implemented and tested
✅ **Relationships**: Properly populated
✅ **Authorization**: Role-based access control working
✅ **Validation**: Input validation working
✅ **Error Handling**: Comprehensive error handling

## API Endpoints Summary

### Authentication
- POST `/api/auth/register` - Create user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user

### Users
- GET `/api/users` - List all users (Admin)
- GET `/api/users/:id` - Get user
- PUT `/api/users/:id` - Update user
- DELETE `/api/users/:id` - Delete user (Admin)

### Incidents
- GET `/api/incidents` - List incidents (with filters)
- GET `/api/incidents/:id` - Get incident
- POST `/api/incidents` - Create incident
- PUT `/api/incidents/:id` - Update incident
- DELETE `/api/incidents/:id` - Delete incident

### Volunteers
- GET `/api/volunteers` - List volunteers
- GET `/api/volunteers/available-tasks` - Get available tasks
- GET `/api/volunteers/my-tasks` - Get my tasks
- POST `/api/volunteers/assign-task/:id` - Assign task
- POST `/api/volunteers/complete-task/:id` - Complete task
- PUT `/api/volunteers/update-location` - Update location

### Admin
- GET `/api/admin/stats` - Get statistics
- POST `/api/admin/verify-incident/:id` - Verify incident
- POST `/api/admin/reject-incident/:id` - Reject incident
- PUT `/api/admin/users/:id/role` - Update user role
- PUT `/api/admin/users/:id/status` - Update user status

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check if port 27017 is available
- Verify connection string in `.env`

### CRUD Operations Not Working
- Run `npm run test-crud` to verify
- Check MongoDB connection
- Verify models are correct
- Check route handlers

### Authentication Issues
- Verify JWT_SECRET in `.env`
- Check token in Authorization header
- Ensure user exists in database

