# Disaster Management System (MERN)

This project is now structured as a MERN application:

- `Backend/` - Node.js + Express API
- `Frontend/` - React SPA
- `MongoDB` - data storage for users, incidents, groups, and audit logs

## Run the Project

### Backend
1. Open a terminal in `Backend`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the API server:
   ```bash
   npm run dev
   ```

### Frontend
1. Open a terminal in `Frontend`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the React app:
   ```bash
   npm start
   ```

## Notes

- The legacy static HTML pages from `Main/` have been removed.
- The React frontend now serves the full user experience through `Frontend/src/App.js`.
- Unused page libraries such as Splide have been removed from `Frontend/public/index.html`.
- The backend API is exposed under `/api` and uses JWT auth, MongoDB, and Socket.IO for realtime updates.

## Project Structure

- `Backend/server.js` - application entry point and Socket.IO setup
- `Backend/routes/` - REST APIs for auth, incidents, volunteers, admin, groups, and audit logs
- `Frontend/src/` - React components and routing
- `Frontend/public/index.html` - optimized frontend HTML entrypoint
