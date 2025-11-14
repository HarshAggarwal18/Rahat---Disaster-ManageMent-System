import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Admin from './components/Admin';
import UserDashboard from './components/UserDashboard';
import Incidents from './components/Incidents';
import Volunteers from './components/Volunteers';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Admin />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/user" 
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/incidents" 
          element={
            <ProtectedRoute>
              <Incidents />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/volunteers" 
          element={
            <ProtectedRoute>
              <Volunteers />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/auth" replace />} />
      </Routes>
    </Router>
  );
}

export default App;


