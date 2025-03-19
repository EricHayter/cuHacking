import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import './App.css';

function App() {
  localStorage.setItem('isAuthenticated', 'false');
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
