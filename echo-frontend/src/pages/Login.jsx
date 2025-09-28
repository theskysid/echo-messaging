import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService.js";
import '../styles/Login.css';

const Login = () => {

    const[username, setUsername] = useState("");
    const[password, setPassword] = useState("");
    const[message, setMessage] = useState("");
    const[isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();


    const handleLogin = async(e) => {
        e.preventDefault();
        setMessage("");    
        setIsLoading(true);

        try {
            const result = await authService.login({username, password});
            if(result && result.success) {
                setMessage("Login successful");
                setIsLoading(false);
                // Navigate immediately instead of waiting
                navigate("/chatarea");
            } else {
                setMessage("Login failed. Please try again.");
                setIsLoading(false);
            }
        } catch (error) {
            setMessage(error.message || "Login failed. Please try again.");
            console.error("Login Error:", error);
            setIsLoading(false);
        }
    }

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <h1>Login</h1>
                    <p>Please login to start chatting</p>
                </div>

                <form action="" onSubmit={handleLogin} className="login-form">
                    <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="username-input" maxLength={20} required disabled={isLoading} />

                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="password-input" maxLength={20} required disabled={isLoading} />

                    <button type="submit" disabled={!username.trim() || !password.trim() || isLoading} className="login-btn">
                        {isLoading ? "Logging in..." : "Login"}
                    </button>
                </form>

                {message && (
                    <p className="auth-message" style={{ color: message.includes("successful") ? "green" : "red" }}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
}

export default Login;