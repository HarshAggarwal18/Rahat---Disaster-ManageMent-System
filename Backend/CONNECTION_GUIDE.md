# Backend Connection Guide

## Quick Start

1. **Install MongoDB:**
   - Download from: https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas

2. **Install dependencies:**
   ```bash
   cd Backend
   npm install
   ```

3. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Update MongoDB URI if needed

4. **Seed database (optional):**
   ```bash
   npm run seed
   ```
   This creates demo users:
   - Admin: admin@demo.com / demo123
   - Volunteer: volunteer@demo.com / demo123
   - User: user@demo.com / demo123

5. **Start server:**
   ```bash
   npm run dev
   ```

## MongoDB Setup Options

### Option 1: Local MongoDB
1. Install MongoDB Community Edition
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/disaster_response`

### Option 2: MongoDB Atlas (Cloud)
1. Create free account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Update `.env` with your Atlas connection string

## API Base URL
- Development: `http://localhost:5000/api`
- Health Check: `http://localhost:5000/api/health`

## Testing the API

Use Postman, Insomnia, or curl:

```bash
# Health check
curl http://localhost:5000/api/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "password123",
    "role": "user"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.com",
    "password": "demo123"
  }'
```

## Frontend Integration

Update your frontend API calls to use:
- Base URL: `http://localhost:5000/api`
- Include JWT token in headers: `Authorization: Bearer <token>`

