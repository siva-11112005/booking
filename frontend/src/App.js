import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import BookAppointment from './pages/BookAppointment';
import MyAppointments from './pages/MyAppointments';
import AdminDashboard from './pages/AdminDashboard';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import InstallPrompt from './components/InstallPrompt';
import './App.css';
import './i18n/config'; // Import i18n configuration

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<PrivateRoute><BookAppointment /></PrivateRoute>} />
          <Route path="/my-appointments" element={<PrivateRoute><MyAppointments /></PrivateRoute>} />
          
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        
        {/* PWA Install Prompt */}
        <InstallPrompt />
      </Router>
    </AuthProvider>
  );
}

export default App;