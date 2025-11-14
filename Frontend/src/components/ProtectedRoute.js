import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole }) => {
  const session = localStorage.getItem('disaster_response_session');
  
  if (!session) {
    return <Navigate to="/auth" replace />;
  }
  
  const user = JSON.parse(session);
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

export default ProtectedRoute;


