import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  // Check if the user is authenticated (use your own logic here)
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'; // Example check from localStorage
  
  if (!isAuthenticated) {
    // If not authenticated, redirect to the login page
    return <Navigate to="/login" />;
  }

  // If authenticated, render the children components (e.g., the Dashboard)
  return children;
};

export default ProtectedRoute;
