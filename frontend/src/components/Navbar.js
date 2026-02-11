import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import LanguageSelector from './LanguageSelector';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <div className="top-header">
        <div className="top-header-content">
          <div className="header-contact">
            <span>📞 +917418042205</span>
            <span>✉️ eswaripalani2002@gmail.com</span>
          </div>
          <div className="header-auth">
            {user ? (
              <>
                <span style={{ color: 'white', fontWeight: '500' }}>
                  👋 {user.name}
                </span>
                <button onClick={handleLogout} className="btn-header btn-logout">
                  Logout
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="btn-header btn-login">
                  Login
                </button>
                <button onClick={() => navigate('/register')} className="btn-header btn-signup">
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="main-nav">
        <div className="main-nav-content">
          <Link to="/" className="clinic-name">
            Eswari Physiotherapy
          </Link>
          <div className="nav-links">
            <Link to="/" className="nav-link">
              Home
            </Link>
            {user && (
              <Link to="/profile" className="nav-link">
                Profile
              </Link>
            )}
            {user && !user.isAdmin && (
              <>
                <Link to="/book" className="nav-link">
                  Book Appointment
                </Link>
                <Link to="/my-appointments" className="nav-link">
                  My Appointments
                </Link>
              </>
            )}
            {user && user.isAdmin && (
              <Link to="/admin" className="nav-link">
                Admin Dashboard
              </Link>
            )}
            <div style={{ marginLeft: '12px' }}>
              <LanguageSelector />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;