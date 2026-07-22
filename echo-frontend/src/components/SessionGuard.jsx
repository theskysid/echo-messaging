import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import LoadingScreen from './LoadingScreen';

const SessionGuard = ({ children }) => {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const initSession = async () => {
            // No existing JWT — nothing to validate, render immediately
            if (!authService.isAuthenticated()) {
                setIsReady(true);
                return;
            }

            try {
                // Validate the stored JWT against the backend and refresh localStorage
                await authService.fetchCurrentUser();
                if (!cancelled) {
                    setIsReady(true);
                }
            } catch (error) {
                // Token is invalid / expired — clean up and send to login
                console.warn('Session validation failed, redirecting to login:', error);
                await authService.logout();
                if (!cancelled) {
                    window.location.href = '/login';
                }
            }
        };

        initSession();

        return () => {
            cancelled = true;
        };
    }, []);

    if (!isReady) {
        return <LoadingScreen />;
    }

    return children;
};

export default SessionGuard;
