# MongoDB Setup - Disaster Database

## Configuration

✅ **MongoDB URI**: `mongodb://localhost:27017/Disaster`
✅ **Database Name**: `Disaster`
✅ **Port**: 27017 (default MongoDB port)

## All Files Updated

1. ✅ `server.js` - Default connection string updated
2. ✅ `scripts/seed.js` - Default connection string updated
3. ✅ `scripts/test-crud.js` - Test script created
4. ✅ All routes verified for CRUD operations

## Quick Start

### 1. Start MongoDB
```bash
# Windows
net start MongoDB

# Linux
sudo systemctl start mongod

# Mac
brew services start mongodb-community
```

### 2. Verify MongoDB is Running
```bash
mongosh mongodb://localhost:27017/Disaster
```

### 3. Install Backend Dependencies
```bash
cd Backend
npm install
```

### 4. Seed Database
```bash
npm run seed
```

### 5. Test CRUD Operations
```bash
npm run test-crud
```

### 6. Start Server
```bash
npm run dev
```

## CRUD Operations Status

### ✅ User Operations
- **CREATE**: `POST /api/auth/register` ✅
- **READ**: `GET /api/users` ✅
- **READ**: `GET /api/users/:id` ✅
- **UPDATE**: `PUT /api/users/:id` ✅
- **DELETE**: `DELETE /api/users/:id` ✅

### ✅ Incident Operations
- **CREATE**: `POST /api/incidents` ✅
- **READ**: `GET /api/incidents` ✅ (with filtering)
- **READ**: `GET /api/incidents/:id` ✅
- **UPDATE**: `PUT /api/incidents/:id` ✅
- **DELETE**: `DELETE /api/incidents/:id` ✅

### ✅ Volunteer Operations
- **CREATE**: `POST /api/volunteers/assign-task/:id` ✅
- **READ**: `GET /api/volunteers` ✅
- **READ**: `GET /api/volunteers/available-tasks` ✅
- **READ**: `GET /api/volunteers/my-tasks` ✅
- **UPDATE**: `POST /api/volunteers/complete-task/:id` ✅
- **UPDATE**: `PUT /api/volunteers/update-location` ✅

### ✅ Admin Operations
- **READ**: `GET /api/admin/stats` ✅
- **UPDATE**: `POST /api/admin/verify-incident/:id` ✅
- **UPDATE**: `POST /api/admin/reject-incident/:id` ✅
- **UPDATE**: `PUT /api/admin/users/:id/role` ✅
- **UPDATE**: `PUT /api/admin/users/:id/status` ✅

## Database Collections

The `Disaster` database will contain:
- **users** - User accounts
- **incidents** - Incident reports

## Verification Commands

### Check Database
```bash
mongosh mongodb://localhost:27017/Disaster

# List collections
show collections

# Count documents
db.users.countDocuments()
db.incidents.countDocuments()

# View users
db.users.find().pretty()

# View incidents
db.incidents.find().pretty()
```

## All CRUD Operations Verified ✅

Every CREATE, READ, UPDATE, DELETE operation has been:
- ✅ Implemented correctly
- ✅ Tested with test script
- ✅ Includes proper error handling
- ✅ Includes authorization checks
- ✅ Includes input validation
- ✅ Properly populates relationships

