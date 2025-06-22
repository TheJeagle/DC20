// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom'; // Import routing components
import './App.css';

// --- Page Components (You'll create these) ---
import HomePage from './pages/HomePage';
import CreatureCreatorPage from './pages/CreatureCreatorPage'; // Your existing creator logic will move here
import AccountPage from './pages/AccountPage'; // Placeholder
import AuthPage from './pages/AuthPage'; // Placeholder for a dedicated login page


// --- Shared Components ---
import Navbar from './components/Navbar'; // New Navbar component

// --- Firebase Auth ---
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setIsLoadingAuth(false);
        });
        return unsubscribe;
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/'); // Redirect to home after logout
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    if (isLoadingAuth) {
        return <div>Loading application...</div>; // Or a spinner component
    }

    return (
        <>
            <Navbar currentUser={currentUser} onLogout={handleLogout} />
            <div className="main-content-area"> {/* Optional wrapper for content below navbar */}
                <Routes>
                    <Route path="/" element={<HomePage currentUser={currentUser} />} />
                    <Route path="/create" element={
                        <CreatureCreatorPage currentUser={currentUser} />
                    } />
                    {/* Add more routes as needed */}
                    <Route path="/auth" element={<AuthPage />} /> {/* Single route for auth */}
                    <Route path="/account" element={currentUser ? <AccountPage /> : <AuthPage />} />
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/register" element={<AuthPage />} />
                    {/* <Route path="/creatures/:creatureId" element={<CreatureViewPage />} /> */}
                    {/* <Route path="/my-creatures" element={currentUser ? <MyCreaturesPage /> : <LoginPage />} /> */}
                </Routes>
            </div>
        </>
    );
}

export default App;