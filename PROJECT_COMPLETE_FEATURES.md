# Disaster Management System - Complete Feature Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Database Models & Schema](#database-models--schema)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [Core Features](#core-features)
7. [System Architecture](#system-architecture)
8. [User Roles & Permissions](#user-roles--permissions)
9. [Real-time Features](#real-time-features)
10. [Data Flow & Workflows](#data-flow--workflows)

---

## Project Overview

**Disaster Management System (Rahat)** is a comprehensive emergency response platform designed to manage disaster incidents, coordinate volunteers, and provide real-time updates during crisis situations. The system enables administrators to verify incidents, dispatch volunteers, and monitor response operations, while volunteers can view available tasks, accept assignments, and update their status.

### Key Purpose
- Report and manage disaster incidents
- Coordinate volunteer response efforts
- Track incident severity and status
- Provide real-time updates to stakeholders
- Maintain audit trails of all actions
- Send notifications to volunteers

---

## Technology Stack

### Backend
- **Node.js** - JavaScript runtime for server-side execution
- **Express.js** - Web framework for building REST API
- **MongoDB** - NoSQL database for data persistence
- **Mongoose** - ODM (Object Data Modeling) for MongoDB
- **Socket.IO** - Real-time bi-directional communication
- **JWT (jsonwebtoken)** - Token-based authentication
- **bcryptjs** - Password encryption and hashing
- **Nodemailer** - Email notifications
- **express-validator** - Input validation and sanitization
- **express-rate-limit** - API rate limiting for security
- **CORS** - Cross-origin resource sharing

### Frontend
- **React 18.x** - UI library for building user interfaces
- **React Router v6** - Client-side routing and navigation
- **Socket.IO Client** - Real-time client-side communication
- **HTML5/CSS3** - Markup and styling
- **Leaflet.js** - Map visualization for incident locations
- **Typed.js** - Animated text effects
- **echarts** - Data visualization for analytics
- **Marker Cluster Group** - Map clustering for better UX

### Development Tools
- **nodemon** - Auto-restart server during development
- **npm/yarn** - Package management

---

## Database Models & Schema

### 1. User Model
**Purpose**: Stores user accounts and profiles for admins, volunteers, and regular users

```
Fields:
- firstName (String, required) - User's first name
- lastName (String, required) - User's last name
- email (String, required, unique) - User's email address
- password (String, required, hashed) - Encrypted password (min 6 chars)
- role (String, enum) - User role: admin, volunteer, or user (default: user)
- status (String, enum) - Account status: active, inactive, suspended (default: active)
- signupDate (Date) - Registration timestamp
- lastLogin (Date) - Last login timestamp

Volunteer-Specific:
- skills (Array of Strings) - Professional skills (medical, rescue, logistics, etc.)
- availability (Boolean, default: true) - Is volunteer currently available
- currentLocation (Object with lat, lng) - Real-time volunteer location
- assignedTasks (Array of Incident refs) - Tasks assigned to volunteer
- hoursLogged (Number, default: 0) - Total hours volunteered

Methods:
- comparePassword() - Verify password during login
- toJSON() - Remove password from response
```

### 2. Incident Model
**Purpose**: Stores disaster incident reports with detailed information

```
Core Fields:
- id (String, unique) - Generated unique incident identifier
- type (String, enum, required) - fire, medical, flood, earthquake, storm, accident, other
- severity (Number, 1-5, required) - Incident severity level
- status (String, enum) - unverified, available, assigned, pending, in-progress, completed
- description (String, required) - Incident description
- location (Object with lat, lng) - GPS coordinates of incident
- timestamp (Date) - When incident was reported
- reporter (String) - Name of person reporting
- reporterId (User ref) - Reference to reporting user

Impact Details:
- peopleRequired (Number, min 1) - Volunteers needed
- affectedPeople (Object):
  - injured (Number) - Count of injured persons
  - deceased (Number) - Count of deceased persons
  - evacuated (Number) - Count of evacuated persons
  - totalAffected (Number) - Total affected persons

Incident Context:
- contactInfo (Object):
  - phone (String) - Contact phone number
  - email (String) - Contact email
  - alternateContact (String) - Backup contact
- propertyDamage (String, enum) - none, minor, moderate, severe, total
- urgency (String, enum) - immediate, within-hours, within-day, within-week
- incidentTime (Date) - When incident occurred
- weatherConditions (Object):
  - type (String, enum) - clear, rainy, stormy, snowy, foggy, windy, other
  - description (String) - Weather description

Resources & Details:
- resourcesNeeded (Array) - medical-supplies, food-water, shelter, clothing, transportation, heavy-equipment, communication, power-generators, other
- additionalDetails (Object):
  - observations (String) - Additional observations
  - hazards (String) - Hazardous situations identified
  - accessibility (String) - Accessibility considerations

Verification & Assignment:
- verified (Boolean) - Admin verification status
- verifiedBy (User ref) - Admin who verified
- verifiedAt (Date) - Verification timestamp
- assignedTo (User ref) - Assigned volunteer
- assignedVolunteers (Array of User refs) - Multiple assigned volunteers
- resolvedAt (Date) - When incident was resolved

AI & Metadata:
- ai (Object):
  - summary (String) - AI-generated summary
  - priority (String) - AI-assigned priority (critical, high, medium, low)
  - confidence (Number) - AI confidence score
  - duplicateOf (String) - Reference if duplicate incident
```

### 3. Group Model
**Purpose**: Groups volunteers or admins for coordinated response

```
Fields:
- name (String, required) - Group name
- createdBy (User ref, required) - Creator of group
- roleScope (String, required, enum) - admin or volunteer
- members (Array of User refs) - Group members
- notes (String) - Additional group notes
- timestamps (createdAt, updatedAt) - Audit timestamps
```

### 4. AuditLog Model
**Purpose**: Complete audit trail of all system actions

```
Fields:
- userId (User ref, required) - User performing action
- userName (String, required) - User name
- role (String, required) - User role at time of action
- action (String, required) - Action performed (create_incident, verify_incident, etc.)
- entityType (String, required) - Type of entity affected (Incident, User, Group)
- entityId (String, required) - ID of affected entity
- entityLabel (String) - Human-readable label of entity
- details (Mixed) - Detailed information about the action
- ipAddress (String) - IP address of requester
- userAgent (String) - Browser/client information
- timestamp (Date) - When action occurred
```

---

## API Endpoints

### Authentication Routes (`/api/auth`)

#### POST `/api/auth/register`
- **Description**: Register a new user
- **Access**: Public
- **Request Body**:
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "securePassword123",
    "role": "volunteer" // optional: admin, volunteer, user (default: user)
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "token": "JWT_TOKEN",
    "user": { id, firstName, lastName, email, role, status }
  }
  ```
- **Validation**:
  - First name required and non-empty
  - Last name required and non-empty
  - Valid email format required
  - Password minimum 6 characters
  - Role must be admin, volunteer, or user

#### POST `/api/auth/login`
- **Description**: Login user and receive JWT token
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "securePassword123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "token": "JWT_TOKEN",
    "user": { id, firstName, lastName, email, role, status, lastLogin }
  }
  ```

#### GET `/api/auth/me`
- **Description**: Get current authenticated user
- **Access**: Private (requires JWT token)
- **Response**: Current user object

---

### Incident Routes (`/api/incidents`)

#### GET `/api/incidents`
- **Description**: Get all incidents with optional filtering
- **Access**: Private (authenticated)
- **Query Parameters**:
  - `status`: Filter by status (unverified, available, assigned, etc.)
  - `verified`: Filter by verification status (true/false)
  - `type`: Filter by incident type
  - `severity`: Filter by severity level (1-5)
- **Response**:
  ```json
  {
    "success": true,
    "count": 10,
    "data": [{ incident objects with populated references }]
  }
  ```
- **Special Feature**: Auto-backfills missing AI metadata on retrieval

#### GET `/api/incidents/:id`
- **Description**: Get specific incident by ID
- **Access**: Private
- **Response**: Single incident object with populated references

#### POST `/api/incidents`
- **Description**: Create new incident report
- **Access**: Private (authenticated)
- **Request Body**:
  ```json
  {
    "type": "fire",
    "severity": 4,
    "description": "Large building fire on Main Street",
    "location": { "lat": 40.7128, "lng": -74.0060 },
    "peopleRequired": 5,
    "contactInfo": { "phone": "123-456-7890", "email": "reporter@example.com" },
    "affectedPeople": { "injured": 2, "evacuated": 10 },
    "propertyDamage": "severe",
    "urgency": "immediate",
    "resourcesNeeded": ["medical-supplies", "heavy-equipment"],
    "weatherConditions": { "type": "clear", "description": "Sunny" },
    "additionalDetails": { "observations": "", "hazards": "Active fire", "accessibility": "" }
  }
  ```
- **Features**:
  - Auto-generates unique incident ID
  - Auto-creates AI analysis with summary, priority, confidence
  - Emits `incident:created` Socket.IO event
  - Sends email notifications to all active volunteers
  - Creates audit log entry
- **Validation**: Extensive field validation with descriptive error messages

#### POST `/api/incidents/backfill-ai`
- **Description**: Populate AI metadata for legacy incidents
- **Access**: Private/Admin only
- **Response**: List of updated incidents
- **Purpose**: One-time migration tool for incidents missing AI analysis

#### PUT `/api/incidents/:id`
- **Description**: Update incident details
- **Access**: Private (creator or admin)
- **Request Body**: Partial incident fields to update
- **Response**: Updated incident object

#### DELETE `/api/incidents/:id`
- **Description**: Delete incident
- **Access**: Private/Admin
- **Response**: Success confirmation

---

### User Routes (`/api/users`)

#### GET `/api/users`
- **Description**: Get all users (paginated list)
- **Access**: Private/Admin only
- **Response**:
  ```json
  {
    "success": true,
    "count": 50,
    "data": [{ user objects excluding password }]
  }
  ```

#### GET `/api/users/:id`
- **Description**: Get specific user profile
- **Access**: Private (own profile or admin)
- **Response**: User object

#### PUT `/api/users/:id`
- **Description**: Update user profile
- **Access**: Private (own profile or admin)
- **Request Body**:
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "skills": ["medical", "rescue"],
    "availability": true,
    "currentLocation": { "lat": 40.7128, "lng": -74.0060 }
  }
  ```

---

### Volunteer Routes (`/api/volunteers`)

#### GET `/api/volunteers`
- **Description**: Get all volunteers with their assigned tasks
- **Access**: Private
- **Response**: List of volunteer users with populated assignedTasks

#### GET `/api/volunteers/available-tasks`
- **Description**: Get available incidents for volunteers
- **Access**: Private/Volunteer only
- **Response**: List of verified, unassigned incidents sorted by severity

#### GET `/api/volunteers/my-tasks`
- **Description**: Get tasks assigned to current volunteer
- **Access**: Private/Volunteer only
- **Response**: List of incidents assigned to current volunteer

#### POST `/api/volunteers/:volunteerId/accept-task/:incidentId`
- **Description**: Accept an available task
- **Access**: Private/Volunteer
- **Response**: Updated incident with volunteer assignment

#### PUT `/api/volunteers/:volunteerId/update-location`
- **Description**: Update volunteer's current GPS location
- **Access**: Private/Volunteer
- **Request Body**: `{ "lat": number, "lng": number }`
- **Features**:
  - Broadcasts location update via Socket.IO
  - Enables real-time map tracking

---

### Admin Routes (`/api/admin`)

#### GET `/api/admin/stats`
- **Description**: Get dashboard statistics for admin
- **Access**: Private/Admin only
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "totalIncidents": 100,
      "verifiedIncidents": 50,
      "unverifiedIncidents": 50,
      "activeVolunteers": 20,
      "totalUsers": 50,
      "completedIncidents": 15,
      "incidentsByStatus": [{ _id: "assigned", count: 10 }],
      "incidentsByType": [{ _id: "fire", count: 5 }],
      "incidentsBySeverity": [{ _id: 4, count: 8 }]
    }
  }
  ```

#### GET `/api/admin/dispatch/:incidentId`
- **Description**: Get AI-recommended volunteer assignments
- **Access**: Private/Admin only
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "volunteer_id",
        "name": "John Doe",
        "score": 0.95,
        "distance": 2.5,
        "skills": ["medical"],
        "availability": true
      }
    ]
  }
  ```

#### POST `/api/admin/verify-incident/:incidentId`
- **Description**: Verify incident authenticity
- **Access**: Private/Admin only
- **Features**:
  - Sets verified flag to true
  - Changes status from unverified to available
  - Records verifier in audit log
  - Emits `incident:updated` Socket.IO event

#### POST `/api/admin/reject-incident/:incidentId`
- **Description**: Reject false/invalid incident
- **Access**: Private/Admin only
- **Features**:
  - Deletes incident from system
  - Records action in audit log

#### POST `/api/admin/assign-volunteer/:incidentId`
- **Description**: Manually assign volunteer to incident
- **Access**: Private/Admin only
- **Request Body**: `{ "volunteerId": "user_id" }`
- **Features**:
  - Updates incident assignment
  - Sends email notification to volunteer
  - Emits Socket.IO event
  - Records in audit log

#### PUT `/api/admin/update-incident-status/:incidentId`
- **Description**: Update incident status
- **Access**: Private/Admin only
- **Request Body**: `{ "status": "in-progress" }`
- **Valid Statuses**: unverified, available, assigned, pending, in-progress, completed

---

### Group Routes (`/api/groups`)

#### GET `/api/groups`
- **Description**: Get groups (admins see all, others see their groups)
- **Access**: Private
- **Response**: List of group objects with populated members

#### POST `/api/groups`
- **Description**: Create new volunteer/admin group
- **Access**: Private (admin or volunteer)
- **Request Body**:
  ```json
  {
    "name": "North District Team",
    "members": ["user_id_1", "user_id_2"],
    "notes": "Emergency response team for north district"
  }
  ```
- **Features**:
  - Auto-sets roleScope based on creator role
  - Validates all members exist and are volunteers
  - Records creation in audit log

#### PUT `/api/groups/:groupId/members`
- **Description**: Add or update group members
- **Access**: Private (group creator or admin)

#### DELETE `/api/groups/:groupId`
- **Description**: Delete group
- **Access**: Private (group creator or admin)

#### POST `/api/groups/:groupId/assign-incident/:incidentId`
- **Description**: Assign entire group to incident
- **Access**: Private/Admin only
- **Features**:
  - Assigns all group members to incident
  - Sends batch notifications

---

### Audit Routes (`/api/audit`)

#### GET `/api/audit/logs`
- **Description**: Get audit trail of all actions
- **Access**: Private/Admin only
- **Query Parameters**:
  - `userId`: Filter by user
  - `action`: Filter by action type
  - `entityType`: Filter by entity type
  - `limit`: Number of records (default: 100)
- **Response**: List of audit log entries with user and entity details

#### GET `/api/audit/logs/:incidentId`
- **Description**: Get audit trail for specific incident
- **Access**: Private/Admin
- **Response**: All actions related to incident

---

## Frontend Components

### 1. Auth Component (`/auth`)
**Purpose**: User authentication interface
- **Features**:
  - Login form with email and password
  - Register form with role selection
  - Form validation
  - Error message display
  - Stores JWT token and user session in localStorage
  - Redirects after successful authentication

### 2. Navigation Component
**Purpose**: App-wide navigation bar
- **Features**:
  - Shows different menu items based on user role
  - Admin menu: Dashboard, Admin Panel, Users, Audit
  - Volunteer menu: My Tasks, Available Incidents
  - Logout functionality
  - Current user display

### 3. Dashboard Component (`/dashboard` - Admin)
**Purpose**: Admin overview and incident management
- **Features**:
  - Real-time incident statistics
  - Interactive Leaflet map with incident markers
  - Cluster groups for better visualization
  - Heat map showing incident density
  - Incident filtering by status, type, severity
  - AI metadata display (confidence, priority)
  - Incident details modal
  - AI analysis insights
  - Socket.IO live updates

### 4. Admin Component (`/admin` - Admin)
**Purpose**: Full admin control panel
- **Features**:
  - **Dashboard Section**:
    - Overview statistics
    - Incident map with real-time updates
    - Volunteer tracking
  - **Incident Verification**:
    - List of unverified incidents
    - Verify/reject buttons
    - Detailed incident information
  - **Incident Assignment**:
    - AI-powered volunteer recommendations
    - Manual volunteer assignment
    - Group assignment capability
  - **Group Management**:
    - Create volunteer groups
    - Assign groups to incidents
    - Manage group members
  - **Analytics**:
    - Incident charts by type, status, severity
    - Response time analytics
    - Volunteer availability charts
  - **Audit Logs**:
    - Complete action history
    - User accountability tracking

### 5. UserDashboard Component (`/user` - Regular Users)
**Purpose**: User-specific view
- **Features**:
  - Personal task list
  - Incident reports
  - Statistics

### 6. Incidents Component (`/incidents`)
**Purpose**: Incident reporting and viewing
- **Features**:
  - Report new incident form with complete details
  - Incident list with filters
  - Incident detail view
  - Status tracking
  - Volunteer assignment tracking

### 7. Volunteers Component (`/volunteers` - Volunteer)
**Purpose**: Volunteer task and availability management
- **Features**:
  - Available tasks list
  - Accept/decline tasks
  - My assigned tasks
  - Task details with location
  - Report task completion
  - Skills and availability management

### 8. ProtectedRoute Component
**Purpose**: Route access control
- **Features**:
  - Session validation
  - Role-based access control
  - Redirects unauthorized users
  - Passes unauthorized state for UI feedback
  - Returns to intended route after login

### 9. Home Component
**Purpose**: Landing page
- **Features**:
  - Application overview
  - Feature highlights
  - Call-to-action to login/register

---

## Core Features

### 1. Incident Reporting & Management

**How It Works**:
1. User fills incident report form with details (type, severity, location, etc.)
2. System generates unique incident ID
3. AI automatically analyzes incident for summary and priority
4. Incident marked as `unverified` initially
5. Admin reviews and verifies incident
6. Incident status changes to `available` and becomes visible to volunteers
7. Volunteers accept tasks or admin assigns manually

**Key Fields**:
- Type: fire, medical, flood, earthquake, storm, accident, other
- Severity: 1-5 scale
- Location: GPS coordinates
- Contact information
- Affected people counts
- Property damage assessment
- Resources needed
- Weather conditions

**Status Lifecycle**: 
`unverified` → `available` → `assigned` → `pending` → `in-progress` → `completed`

### 2. AI-Powered Incident Analysis

**Features**:
- **Automatic Summary Generation**: AI creates brief incident summary
- **Priority Assignment**: Critical, High, Medium, Low based on factors:
  - Incident type
  - Severity level
  - Number of affected people
  - Resource requirements
- **Confidence Scoring**: 0-100 confidence in analysis
- **Duplicate Detection**: Identifies potential duplicate reports
- **Legacy Backfill**: Script to add AI metadata to old incidents

**Implementation**:
- AI analysis built on incident creation
- Reused from recent incident data for context
- Backfill available for incidents with missing analysis

### 3. Volunteer Management

**Features**:
- **Volunteer Profile**:
  - Skills tracking (medical, rescue, logistics, etc.)
  - Availability status
  - Current location (GPS)
  - Hours logged
  - Assigned tasks list

**Task Management**:
- View available verified incidents
- Accept tasks (changes status to assigned)
- Track assigned tasks
- Update task status (pending, in-progress, completed)
- Report location in real-time

### 4. Real-time Updates via Socket.IO

**Events Emitted**:
- `incident:created` - New incident reported
- `incident:updated` - Incident modified
- `incident:deleted` - Incident removed
- `volunteer:location` - Volunteer location update
- `team:message` - Team communication

**Usage**:
- All connected clients receive updates instantly
- Dashboards refresh without manual refresh
- Real-time notifications for admins and volunteers

### 5. Email Notifications

**Triggers**:
- **New Incident**: All active volunteers notified
- **Task Assignment**: Assigned volunteer receives notification
- **Status Changes**: Relevant parties notified

**Templates**:
- Incident reported email with details
- Task assignment email with incident info
- Status change emails

**Configuration**:
- SMTP settings via environment variables
- Graceful degradation if email fails
- Improved error logging

### 6. Admin Dashboard & Analytics

**Statistics Displayed**:
- Total incidents
- Verified vs unverified ratio
- Active volunteers
- Completed incidents
- Incidents by status
- Incidents by type
- Incidents by severity
- Average response time

**Visualization**:
- Real-time map with incident markers
- Clustering for better UX
- Heat map showing incident density
- Charts for analytics

### 7. Role-Based Access Control

**Roles**:
- **Admin**: Full system access, verification, assignment, analytics
- **Volunteer**: Task viewing, acceptance, location tracking
- **User**: Basic incident reporting

**Implementation**:
- JWT token-based authentication
- Role validation on routes
- Frontend route guards with ProtectedRoute
- Backend authorization middleware

### 8. Audit Logging

**Logged Actions**:
- User registration and login
- Incident creation and updates
- Incident verification/rejection
- Volunteer assignments
- Group creation
- Location updates
- Status changes

**Audit Entry Contains**:
- User ID and name
- User role
- Action type
- Entity type and ID
- Detailed changes
- IP address
- User agent (browser info)
- Timestamp

### 9. Group Coordination

**Purpose**: Team-based incident response

**Features**:
- Create admin or volunteer groups
- Assign group members
- Dispatch entire group to incident
- Batch notifications
- Role-scoped groups (admin vs volunteer)

### 10. Volunteer Dispatch Recommendations

**Algorithm Factors**:
- Volunteer availability
- Proximity to incident
- Required vs available skills match
- Historical response time
- Current workload

**Process**:
1. Admin selects incident
2. System queries active volunteers
3. Calculates recommendation score for each
4. Displays top 5 recommended volunteers
5. Admin can accept recommendation or manually select

---

## System Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  Auth Page  │  │ Dashboards  │  │ Incident Forms   │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
│         │                │                  │                │
├─────────┼────────────────┼──────────────────┼─────────────┤
│         │    REST API    │                  │               │
│    API Client (axios/fetch)                 │               │
│         │                                   │               │
├─────────┴───────────────────────────────────┴─────────────┤
│                  Express Backend API                        │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Routes: /auth, /users, /incidents, /admin, etc.  │   │
│  │  Middleware: protect, authorize, validation        │   │
│  │  Rate Limiting: 300 requests per 15 minutes        │   │
│  └────────────────────────────────────────────────────┘   │
│                        │                                    │
├────────────────────────┼────────────────────────────────┤
│                 Socket.IO                                  │
│  ┌─────────────────────┴──────────────────────────┐   │
│  │  Real-time Events: incident updates, locations  │   │
│  │  Bi-directional communication                   │   │
│  └──────────────────────────────────────────────────┘   │
│                        │                                    │
├────────────────────────┼────────────────────────────────┤
│                   MongoDB                                  │
│  ┌────────┬─────────┬──────────┬────────┐               │
│  │ Users  │Incidents│ Groups   │ Audits │               │
│  └────────┴─────────┴──────────┴────────┘               │
└──────────────────────────────────────────────────────────┘
```

### Request/Response Cycle

1. **Frontend**: User performs action (submit form, click button)
2. **API Call**: Frontend makes HTTP request with JWT token
3. **Authentication**: Backend verifies JWT token
4. **Authorization**: Backend checks user role/permissions
5. **Validation**: Backend validates request data
6. **Processing**: Backend processes request (CRUD operations)
7. **Database**: MongoDB stores/retrieves data
8. **Response**: Backend sends JSON response
9. **Frontend Update**: Frontend updates UI with response
10. **Socket.IO**: If applicable, event broadcast to other clients

---

## User Roles & Permissions

### Admin Role
**Capabilities**:
- View all incidents
- Verify user-reported incidents
- Reject false incidents
- Assign volunteers to incidents
- Create and manage groups
- Assign groups to incidents
- View admin dashboard with analytics
- Access audit logs
- View all users and volunteers
- Manage volunteer availability

**Routes**:
- `/dashboard` - Admin dashboard
- `/admin` - Admin control panel
- `/users` - User management
- `/audit` - Audit logs

**API Access**:
- All endpoints marked as `/admin`
- User list endpoints
- Audit log endpoints

### Volunteer Role
**Capabilities**:
- View available incidents
- Accept task assignments
- View assigned tasks
- Update location in real-time
- Update profile (skills, availability)
- Report task completion

**Routes**:
- `/incidents` - Incident list
- `/volunteers` - Volunteer profile
- `/user` - Personal dashboard

**API Access**:
- `GET /volunteers/available-tasks`
- `GET /volunteers/my-tasks`
- `POST /volunteers/accept-task`
- `PUT /users/:id` (own profile only)

### User Role
**Capabilities**:
- Report incidents
- View personal dashboard
- Track own incident reports

**Routes**:
- `/incidents` - Report new incident
- `/user` - Personal view

**API Access**:
- Can create incidents only

---

## Real-time Features

### Socket.IO Integration

**Connection Establishment**:
```javascript
// Backend (server.js)
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL }
});

// Frontend (socket.js)
import io from 'socket.io-client';
export const socket = io(process.env.REACT_APP_API_URL);
```

**Events Broadcasting**:

| Event | When | Purpose | Who Receives |
|-------|------|---------|--------------|
| `incident:created` | New incident reported | Notify of new incident | All connected users |
| `incident:updated` | Incident modified | Refresh incident data | All connected users |
| `incident:deleted` | Incident removed | Update lists | All connected users |
| `volunteer:location` | Location update | Track volunteer | Admins & team members |
| `connect` | User joins | Connection established | User |
| `disconnect` | User leaves | Connection lost | User |
| `reconnect` | User reconnects | Re-establish connection | User |

**Frontend Usage**:
```javascript
// Listen to events
socket.on('incident:created', (incident) => {
  refreshIncidentList();
});

// Handle connection status
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

---

## Data Flow & Workflows

### Workflow 1: Incident Reporting & Response

```
1. INCIDENT REPORT
   User fills form with incident details
   ↓
2. SUBMISSION
   POST /api/incidents with all details
   ↓
3. AUTO-ANALYSIS
   Backend generates AI analysis
   Assigns priority and confidence
   ↓
4. STORAGE
   Incident saved to MongoDB
   Status: unverified
   ↓
5. BROADCAST
   Socket.IO emits incident:created
   All dashboards notified
   ↓
6. ADMIN REVIEW
   Admin receives notification
   Reviews incident details
   ↓
7. VERIFICATION
   Admin approves: POST /api/admin/verify-incident
   Status changes: unverified → available
   ↓
8. VOLUNTEER NOTIFICATION
   Email sent to all active volunteers
   Socket.IO emits incident:updated
   ↓
9. VOLUNTEER RESPONSE
   Volunteers view available incidents
   Accept tasks: POST /api/volunteers/:volunteerId/accept-task
   ↓
10. ASSIGNMENT
    Incident assigned to volunteer
    Email notification sent
    Status changes: available → assigned
    ↓
11. RESPONSE
    Volunteer updates work location
    Reports progress and completion
    ↓
12. COMPLETION
    Status changes to completed
    Audit log records completion
    Analytics updated
```

### Workflow 2: Volunteer Assignment

```
1. ADMIN SELECTS INCIDENT
   GET /api/admin/dispatch/:incidentId
   ↓
2. AI RECOMMENDATIONS
   System calculates volunteer scores:
   - Availability
   - Distance
   - Skills match
   - Response history
   ↓
3. ADMIN CHOOSES
   Admin selects volunteer or group
   ↓
4. ASSIGNMENT
   POST /api/admin/assign-volunteer
   ↓
5. EMAIL SENT
   Volunteer receives task assignment
   ↓
6. DATABASE UPDATE
   Incident.assignedTo = volunteer_id
   Status = assigned
   ↓
7. REAL-TIME UPDATE
   Socket.IO broadcasts incident:updated
   Dashboards refresh
   Audit log records assignment
   ↓
8. VOLUNTEER NOTIFIED
   Frontend notification popup
   Task appears in "My Tasks"
   ↓
9. VOLUNTEER ACCEPTS
   Updates location and status
```

### Workflow 3: Group Dispatch

```
1. CREATE GROUP
   POST /api/groups
   Add volunteer members
   ↓
2. ASSIGN TO INCIDENT
   POST /api/groups/:groupId/assign-incident
   ↓
3. BULK ASSIGNMENT
   All group members assigned
   ↓
4. NOTIFICATIONS
   Email sent to all members
   ↓
5. COORDINATION
   All members see task
   Location updates coordinated
   Real-time status sync via Socket.IO
```

### Workflow 4: Audit Logging

```
Every Action Triggers:
1. Create AuditLog entry with:
   - User ID & name
   - User role
   - Action type
   - Entity affected
   - Changes made
   - Timestamp
   - IP address
   - Browser info
   ↓
2. Entry stored in MongoDB
   ↓
3. Admin can query via:
   GET /api/audit/logs
   Filtered by user, action, entity
   ↓
4. Full accountability trail maintained
```

---

## Deployment & Configuration

### Environment Variables Required

```env
# Database
MONGODB_URI=mongodb://localhost:27017/Disaster

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Email (SMTP)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_FROM=noreply@disastermanagement.com

# Frontend
FRONTEND_URL=http://localhost:3000
REACT_APP_API_URL=http://localhost:5000/api

# Server
PORT=5000
NODE_ENV=development
```

### Running the Application

```bash
# Backend
cd Backend
npm install
npm run seed-india  # Optional: seed with sample data
npm run dev         # Start with nodemon
# OR
npm start          # Start normally

# Frontend
cd Frontend
npm install
npm start          # Starts on http://localhost:3000
```

### Database Seeding

- `npm run seed` - Basic sample data
- `npm run seed-india` - India-specific incident data and locations
- `npm run backfill-ai` - Add AI metadata to legacy incidents

---

## Performance & Scalability

### Optimizations Implemented

1. **Rate Limiting**: 300 requests per 15 minutes per IP
2. **JWT Tokens**: Stateless authentication
3. **Database Indexing**: On frequently queried fields
4. **Lazy Loading**: Frontend loads data on demand
5. **Socket.IO Optimization**: Efficient event broadcasting
6. **CORS Configuration**: Restricted to frontend origin

### Scalability Considerations

1. **Horizontal Scaling**: Use load balancer for multiple servers
2. **Database Replication**: MongoDB replica sets
3. **Caching Layer**: Redis for frequently accessed data
4. **CDN**: Serve static assets

---

## Security Features

1. **JWT Authentication**: Secure token-based auth
2. **Password Hashing**: bcryptjs with salt
3. **Input Validation**: express-validator on all inputs
4. **SQL/NoSQL Injection**: Mongoose schema validation
5. **CORS**: Restricted to authorized origins
6. **Rate Limiting**: Prevent brute force attacks
7. **Role-Based Access**: Backend authorization checks
8. **Audit Trail**: Complete action logging
9. **HTTPS**: Use in production
10. **Helmet**: Security headers (recommended)

---

## Future Enhancements

1. **Mobile App**: React Native version for iOS/Android
2. **Advanced Analytics**: ML-powered incident prediction
3. **Multi-language Support**: Internationalization (i18n)
4. **Mobile Push Notifications**: Instant alerts
5. **Weather Integration**: Real-time weather data
6. **Incident Forecasting**: Predict future incidents
7. **Video Conferencing**: Real-time team communication
8. **Document Management**: Attach files to incidents
9. **Automated Dispatch**: AI auto-assignments
10. **Integration APIs**: Third-party system connections

---

## Troubleshooting

### Common Issues

**Issue**: Emails not sending
- **Solution**: Check SMTP_USER, SMTP_PASS are correct
- **Alternative**: Check logs for "Email not configured" message

**Issue**: Real-time updates not working
- **Solution**: Check Socket.IO connection in browser console
- **Verify**: FRONTEND_URL env var matches client origin

**Issue**: API 401 Unauthorized
- **Solution**: Token may have expired, re-login
- **Check**: Authorization header includes "Bearer TOKEN"

**Issue**: Volunteers not appearing in recommendations
- **Solution**: Mark volunteers as `status: active` and `availability: true`

**Issue**: Duplicate incidents showing
- **Solution**: Run `npm run backfill-ai` to update AI analysis

---

## Support & Documentation

- **Backend API Docs**: Currently this file
- **Frontend Components**: Check JSDoc comments in React files
- **Database Schema**: See models in Backend/models/
- **Routes**: Check Backend/routes/ files

**Contact**: For issues or questions, check logs and audit trail for error details.

---

*Last Updated: April 2026*
*Version: 1.0.0*
*Status: Production Ready*
