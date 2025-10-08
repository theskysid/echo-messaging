import React from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import '../styles/MainPage.css';

const MainPage = () => {
    const isAuthenticated = authService.isAuthenticated();

    return (
        <div className="mainpage-container">
            <div className="mainpage-content">
                <div className="mainpage-header">
                    <div className="mainpage-icon">💬</div>
                    <h1>Welcome to Chat Application</h1>
                    <p>Connect with people around the world in real-time</p>
                </div>

                <div className="mainpage-features">
                    <div className="feature">
                        <div className="feature-icon">🌐</div>
                        <h3>Real-time Messaging</h3>
                        <p>Chat instantly with users online</p>
                    </div>
                    <div className="feature">
                        <div className="feature-icon">👥</div>
                        <h3>Multiple Users</h3>
                        <p>See who's online and join the conversation</p>
                    </div>
                    <div className="feature">
                        <div className="feature-icon">🔒</div>
                        <h3>Private Chats</h3>
                        <p>Send private messages to specific users</p>
                    </div>
                </div>

                <div className="mainpage-actions">
                    {isAuthenticated ? (
                        <Link to="/chatarea" className="primary-btn">
                            Go to Chat Area
                        </Link>
                    ) : (
                        <div className="auth-buttons">
                            <Link to="/login" className="primary-btn">
                                Login
                            </Link>
                            <Link to="/signup" className="secondary-btn">
                                Sign Up
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MainPage;