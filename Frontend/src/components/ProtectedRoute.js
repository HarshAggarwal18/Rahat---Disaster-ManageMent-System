import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole }) => {
  const session = localStorage.getItem('disaster_response_session');
  const location = useLocation();

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  const user = JSON.parse(session);

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace state={{ unauthorized: true, attemptedRoute: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;


