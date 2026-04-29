# CRUD Operations Verification Guide

## MongoDB Connection
- **URI**: `mongodb://localhost:27017/Disaster`
- **Database Name**: `Disaster`

## All CRUD Operations Implemented

### ✅ USER CRUD Operations

#### CREATE
- **Route**: `POST /api/auth/register`
- **Status**: ✅ Working
- **Features**: 
  - Password hashing
  - Email validation
  - Role assignment
  - Duplicate email check

#### READ
- **Route**: `GET /api/users` (Admin only)
- **Route**: `GET /api/users/:id` (Protected)
- **Status**: ✅ Working
- **Features**:
  - Get all users (Admin)
  - Get single user by ID
  - Password excluded from response
  - Authorization checks

#### UPDATE
- **Route**: `PUT /api/users/:id` (Protected)
- **Status**: ✅ Working
- **Features**:
  - Update firstName, lastName
  - Update skills (for volunteers)
  - Update availability
  - Update currentLocation
  - Authorization checks

#### DELETE
- **Route**: `DELETE /api/users/:id` (Admin only)
- **Status**: ✅ Working
- **Features**:
  - Soft delete using deleteOne()
  - Admin authorization required

### ✅ INCIDENT CRUD Operations

#### CREATE
- **Route**: `POST /api/incidents` (Protected)
- **Status**: ✅ Working
- **Features**:
  - Auto-generate unique incident ID
  - Link to reporter (user)
  - Location validation
  - Type and severity validation
  - Default status: 'unverified'

#### READ
- **Route**: `GET /api/incidents` (Protected)
- **Route**: `GET /api/incidents/:id` (Protected)
- **Status**: ✅ Working
- **Features**:
  - Get all incidents with filtering
  - Filter by: status, verified, type, severity
  - Get single incident by ID
  - Populate relationships (reporter, assignedTo, verifiedBy)
  - Sort by timestamp (newest first)

#### UPDATE
- **Route**: `PUT /api/incidents/:id` (Protected)
- **Status**: ✅ Working
- **Features**:
  - Update status
  - Update description
  - Update severity
  - Assign to volunteer
  - Verify incident (Admin only)
  - Auto-set resolvedAt when completed
  - Authorization checks (Admin, Reporter, or Assigned)

#### DELETE
- **Route**: `DELETE /api/incidents/:id` (Protected)
- **Status**: ✅ Working
- **Features**:
  - Delete incident
  - Admin or Reporter can delete
  - Authorization checks

### ✅ VOLUNTEER Operations

#### CREATE (Task Assignment)
- **Route**: `POST /api/volunteers/assign-task/:incidentId` (Volunteer only)
- **Status**: ✅ Working
- **Features**:
  - Assign available incident to volunteer
  - Update incident status to 'pending'
  - Add to volunteer's assignedTasks array

#### READ
- **Route**: `GET /api/volunteers` (Protected)
- **Route**: `GET /api/volunteers/available-tasks` (Volunteer only)
- **Route**: `GET /api/volunteers/my-tasks` (Volunteer only)
- **Status**: ✅ Working
- **Features**:
  - Get all volunteers
  - Get available tasks (verified, status: available)
  - Get volunteer's assigned tasks
  - Populate relationships

#### UPDATE
- **Route**: `POST /api/volunteers/complete-task/:incidentId` (Volunteer only)
- **Route**: `PUT /api/volunteers/update-location` (Volunteer only)
- **Status**: ✅ Working
- **Features**:
  - Mark task as completed
  - Update volunteer location
  - Auto-set resolvedAt timestamp

### ✅ ADMIN Operations

#### READ (Statistics)
- **Route**: `GET /api/admin/stats` (Admin only)
- **Status**: ✅ Working
- **Features**:
  - Total incidents count
  - Verified/unverified counts
  - Active volunteers count
  - Incidents by status, type, severity
  - Aggregation queries

#### UPDATE (Verification)
- **Route**: `POST /api/admin/verify-incident/:incidentId` (Admin only)
- **Route**: `POST /api/admin/reject-incident/:incidentId` (Admin only)
- **Status**: ✅ Working
- **Features**:
  - Verify incidents
  - Reject and delete incidents
  - Update user roles
  - Update user status

## Testing CRUD Operations

### Run Test Script
```bash
cd Backend
npm run test-crud
```

This will test:
- ✅ User CREATE, READ, UPDATE, DELETE
- ✅ Incident CREATE, READ, UPDATE, DELETE
- ✅ Query/Filter operations
- ✅ Relationship population
- ✅ All operations with proper error handling

### Manual Testing

1. **Start Server:**
   ```bash
   npm run dev
   ```

2. **Seed Database:**
   ```bash
   npm run seed
   ```

3. **Test with Postman/curl:**

   **Register User:**
   ```bash
   POST http://localhost:5000/api/auth/register
   {
     "firstName": "Test",
     "lastName": "User",
     "email": "test@example.com",
     "password": "test123",
     "role": "user"
   }
   ```

   **Login:**
   ```bash
   POST http://localhost:5000/api/auth/login
   {
     "email": "admin@demo.com",
     "password": "demo123"
   }
   ```

   **Create Incident:**
   ```bash
   POST http://localhost:5000/api/incidents
   Authorization: Bearer <token>
   {
     "type": "fire",
     "severity": 5,
     "description": "Test incident",
     "location": {
       "lat": 40.7128,
       "lng": -74.0060
     }
   }
   ```

   **Get All Incidents:**
   ```bash
   GET http://localhost:5000/api/incidents
   Authorization: Bearer <token>
   ```

   **Update Incident:**
   ```bash
   PUT http://localhost:5000/api/incidents/INC-2025-001
   Authorization: Bearer <token>
   {
     "status": "available",
     "verified": true
   }
   ```

## Database Verification

### Check MongoDB Connection
```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/Disaster

# List collections
show collections

# Check users
db.users.find().pretty()

# Check incidents
db.incidents.find().pretty()

# Count documents
db.users.countDocuments()
db.incidents.countDocuments()
```

## All Operations Verified ✅

- ✅ CREATE operations work correctly
- ✅ READ operations work correctly (with filtering)
- ✅ UPDATE operations work correctly
- ✅ DELETE operations work correctly
- ✅ Relationships populate correctly
- ✅ Authorization checks work correctly
- ✅ Validation works correctly
- ✅ Error handling works correctly

