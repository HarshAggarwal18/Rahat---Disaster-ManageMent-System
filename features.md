# Feature Descriptions

## 1. Audit logging of admin/user actions into `AuditLog` collection
- **What it is:** A backend logger that records important actions performed by authenticated users.
- **Where it happens:** `Backend/utils/auditLogger.js` and `Backend/models/AuditLog.js`.
- **Usage:** Called from routes such as `Backend/routes/incidents.js`, `Backend/routes/admin.js`, `Backend/routes/auth.js`, and `Backend/routes/groups.js`.
- **Stored fields:** `userId`, `userName`, `role`, `action`, `entityType`, `entityId`, `details`, `ipAddress`, `userAgent`.
- **Why it matters:** Tracks changes for auditing, debugging, and compliance, especially for admin approvals, incident updates, and user management.

## 2. Admin-only routing via `ProtectedRoute` and server-side role checking
- **What it is:** A permission layer that restricts access to certain pages and API endpoints.
- **Frontend side:** `Frontend/src/components/ProtectedRoute.js`
  - checks for a valid session stored in local storage
  - redirects unauthorized users to `/auth` or `/dashboard`
  - supports `requiredRole` to limit routes to admin-only pages
- **Backend side:** `Backend/middleware/auth.js`
  - `protect` verifies JWT tokens and loads `req.user`
  - `authorize(...roles)` validates `req.user.role`
- **Usage:** Applied to routes in `Backend/routes/admin.js`, `Backend/routes/audit.js`, `Backend/routes/users.js`, `Backend/routes/groups.js`, and other protected endpoints.
- **Why it matters:** Ensures only authorized users can access admin functions and protects API security.

## 3. Real-time updates via Socket.IO events for incident create/update/delete
- **What it is:** A real-time channel that broadcasts incident changes to all connected clients.
- **Where it happens:** `Backend/server.js` initializes Socket.IO; incident routes emit events.
- **Events emitted:**
  - `incident:created`
  - `incident:updated`
  - `incident:deleted`
- **Usage:** After creating, updating, or deleting incidents, the backend pushes the latest incident data so clients can refresh automatically.
- **Why it matters:** Keeps dashboards and volunteer views synchronized without manual refresh.

## 4. Email notifications
- **What it is:** SMTP-based notification emails sent by backend logic.
- **Where it happens:** `Backend/utils/email.js`, `Backend/routes/incidents.js`, `Backend/routes/admin.js`, `Backend/routes/volunteers.js`.
- **Trigger points:**
  - New incident report → sends `incidentReportedEmail`
  - Incident assignment → sends `incidentAssignedEmail`
- **Who receives notifications:**
  - New incidents are emailed to all active volunteers (`role: 'volunteer', status: 'active'`)
  - Assigned incidents are emailed to the volunteer who is assigned
- **Configuration:** Requires `SMTP_USER`, `SMTP_PASS`, and optionally `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` in environment variables.
- **Why it matters:** Alerts volunteers to new incidents and informs responders when they are assigned.

## 5. Socket.IO broadcasts event to update connected clients
- **What it is:** Backend broadcast mechanism that sends messages to every connected socket client.
- **How it works:** `io.emit(...)` in backend route handlers sends events globally.
- **Common broadcast usage:** incident lifecycle events and volunteer location or task updates.
- **Why it matters:** Enables live multi-user coordination, so connected clients receive updates in real time.

## 6. `Group` `roleScope` dependency
- **What it is:** A required field in the `Group` model that defines the group’s authorization scope.
- **Where it is defined:** `Backend/models/Group.js`
- **Field details:**
  - `roleScope` is required
  - valid values: `admin`, `volunteer`
- **Usage:** `Backend/routes/groups.js` sets `roleScope: req.user.role` when creating groups.
- **Why it matters:** Ensures groups are correctly scoped for admin or volunteer operations; missing `roleScope` causes validation failure.
