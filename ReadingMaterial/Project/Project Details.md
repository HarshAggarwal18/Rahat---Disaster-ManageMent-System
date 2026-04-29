# Project Details

## Overview
Disaster Response Management System with a Node.js/Express API, a React frontend, and a static HTML demo UI. 
-The system supports role-based access for admins, volunteers, and citizens to report, verify, and resolve incidents.

## Workspace Structure
- Backend/: REST API service (Node.js, Express, MongoDB)
- Frontend/: React UI for role-based dashboards
- Main/: Static HTML/CSS/JS demo pages

## Backend (API)
- Tech stack: Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, express-validator
- Features:
  - JWT authentication and role-based access control
  - User management (admin, volunteer, user)
  - Incident reporting, updates, and verification
  - Volunteer task assignment and completion
  - Admin statistics endpoint
- Key routes:
  - Auth: register, login, current user
  - Users: CRUD with admin protection
  - Incidents: CRUD and status updates
  - Volunteers: assign tasks, update location, available tasks
  - Admin: verify/reject incidents, update user roles and status
- Data models:
  - User: profile, role, status, skills, availability, location
  - Incident: type, severity, status, location, verification, assignment

## Frontend (React)
- Tech stack: React 18, React Router, Leaflet, ECharts, Tailwind via CDN, Anime.js
- Features:
  - Authentication with role-based routing
  - Dashboard with statistics and map
  - Admin panel for verification and user management
  - User dashboard for reporting and tracking incidents
  - Volunteer dashboard for task management
- Notes:
  - Demo users available (admin, volunteer, user)
  - Local storage used for demo state

## Static UI (Main)
- Purpose: standalone HTML pages for quick demo or UI mockups
- Pages: index, auth, admin, incidents, user, volunteers
- Libraries: Tailwind CDN, Leaflet, ECharts, Anime.js, Typed.js, Splide

## Current Capabilities Summary
- Multi-role access (admin, volunteer, citizen)
- Incident reporting and management
- Verification workflow for admin
- Volunteer task assignment flow
- Map-based incident visualization
- Dashboard stats and analytics views

## How to Run (Quick Reference)
- Backend:
  - Install: npm install
  - Start: npm run dev (or npm start)
- Frontend:
  - Install: npm install
  - Start: npm start

## Documentation Available
- Backend setup and guides in Backend/ (README, setup, MongoDB guide)
- Frontend integration guide and fixes in Frontend/
