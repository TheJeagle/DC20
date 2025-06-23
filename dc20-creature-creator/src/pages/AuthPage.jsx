// src/pages/AuthPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase'; // Your Firebase auth instance
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
} from "firebase/auth";
import './AuthPage.css'; // We'll create this for styling

// Example: Import your images if they are local
// import loginImage from '../assets/login-image-half.png';
// import registerImage from '../assets/register-image-half.png';

const AuthPage = () => {
    const [isLoginView, setIsLoginView] = useState(true); // true for Login, false for Register
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // For registration
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!isLoginView) { // Registering
            if (password !== confirmPassword) {
                setError("Passwords do not match.");
                setLoading(false);
                return;
            }
            try {
                await createUserWithEmailAndPassword(auth, email, password);
                navigate('/'); // Redirect to homepage after successful registration
            } catch (err) {
                setError(err.message);
            }
        } else { // Logging in
            try {
                await signInWithEmailAndPassword(auth, email, password);
                navigate('/'); // Redirect to homepage after successful login
            } catch (err) {
                setError(err.message);
            }
        }
        setLoading(false);
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            navigate('/'); // Redirect to homepage
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    const toggleView = () => {
        setIsLoginView(!isLoginView);
        setError(''); // Clear errors when switching views
        setEmail('');
        setPassword('');
        setConfirmPassword('');
    };




    return (
        <div className="auth-page-container">
            <div className={`auth-card ${isLoginView ? 'login-view' : 'register-view'}`}>
                {/* Left Side (Image or Form) */}
                <div className="auth-card-half image-half left-half">
                    {/* In a real implementation, you might have different images or a more complex animation */}
                    <img src={isLoginView ? "/placeholder-login-left.jpg" : "/placeholder-register-right.jpg"} alt={isLoginView ? "Login Theme" : "Register Theme"} />
                </div>

                {/* Right Side (Form or Image) */}
                <div className="auth-card-half form-half right-half">
                    <form onSubmit={handleSubmit} className="auth-form-content">
                        <h2>{isLoginView ? 'Login' : 'Create Account'}</h2>
                        {error && <p className="auth-error">{error}</p>}
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        {!isLoginView && (
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                            </div>
                        )}
                        <button type="submit" className="auth-button" disabled={loading}>
                            {loading ? 'Processing...' : (isLoginView ? 'Login' : 'Register')}
                        </button>

                        <div className="or-divider"><span>OR</span></div>

                        <button type="button" onClick={handleGoogleSignIn} className="google-signin-button" disabled={loading}>
                            {/* Add Google Icon here later if desired */}
                            Sign in with Google
                        </button>

                        <p className="toggle-auth-view">
                            {isLoginView ? "Don't have an account?" : "Already have an account?"}
                            <button type="button" onClick={toggleView} className="toggle-link">
                                {isLoginView ? 'Register here' : 'Login here'}
                            </button>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;