// src/components/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css'; // Create this CSS file
// import YourLogo from '../assets/your-logo.png'; // Example logo import

const Navbar = ({ currentUser, onLogout }) => {
    const navigate = useNavigate();

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/" className="navbar-logo">
                    {/* <img src={YourLogo} alt="DC20 Creator Logo" /> */}
                    <span>DC20 Hub</span> {/* Placeholder text logo */}
                </Link>
            </div>
            <div className="navbar-links">
                {/* Add other nav links here if needed, e.g., "Browse Creatures" */}
            </div>
            <div className="navbar-actions">
                <button onClick={() => navigate('/create')} className="navbar-button create-button">
                    Create New Creature
                </button>
                {currentUser ? (
                    <>
                        <button onClick={() => navigate('/account')} className="navbar-button account-button">
                            Account ({currentUser.email ? currentUser.email.split('@')[0] : 'User'})
                        </button>
                        <button onClick={onLogout} className="navbar-button logout-button">
                            Logout
                        </button>
                    </>
                ) : (
                    // Link both login and register to the same /auth page
                    <button onClick={() => navigate('/auth')} className="navbar-button">Login / Register</button>
                )}
            </div>
        </nav>
    );
};

export default Navbar;