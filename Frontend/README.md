# Disaster Response Management System - React Frontend

This is the React frontend for the Disaster Response Management System.

## Features

- **Authentication**: Login and Signup with role-based access
- **Dashboard**: Main dashboard with statistics and live incident map
- **Admin Panel**: Incident verification, user management, and system analytics
- **User Dashboard**: Report incidents and track submissions
- **Incident Management**: View, filter, and manage incidents
- **Volunteer Dashboard**: Accept tasks, track assignments, and complete incidents

## Installation

1. Navigate to the Frontend directory:
```bash
cd Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Project Structure

```
Frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Auth.js
│   │   ├── Dashboard.js
│   │   ├── Admin.js
│   │   ├── UserDashboard.js
│   │   ├── Incidents.js
│   │   ├── Volunteers.js
│   │   ├── Navigation.js
│   │   └── ProtectedRoute.js
│   ├── utils/
│   │   ├── storage.js
│   │   ├── notifications.js
│   │   └── format.js
│   ├── App.js
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## Demo Credentials

The system includes demo users:
- **Admin**: admin@demo.com / demo123
- **Volunteer**: volunteer@demo.com / demo123
- **User**: user@demo.com / demo123

You can also create new accounts with any email/password combination.

## Technologies Used

- React 18
- React Router DOM
- Tailwind CSS (via CDN)
- Leaflet Maps
- ECharts (for analytics)
- Anime.js (for animations)

## Notes

- All data is stored in localStorage for demo purposes
- Maps require internet connection for tile loading
- The system uses role-based routing and access control


