import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {authService} from "../services/authService.js";

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
            const result = await authService.Login({username, password});
            if(result.success) {
                setMessage("Login successful");
                setTimeout(() => {
                    navigate("/chatarea");
                }, 2000); //2 seconds delay before redirecting to login
            }
        } catch (error) {
            setMessage(error.message || "Login failed. Please try again.");
            console.error("Login Error:", error);
        }
        
    }

    return (
        <div className="Login-container">
            <div className="Login-box">
                <div className="Login-header">
                    <h1>Login</h1>
                    <p>Create an account to start chatting</p>
                </div>

                <form action="" onSubmit={handleLogin} className="Login-form">
                    <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="username-input" maxLength={20} required disabled={isLoading} />

                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="password-input" maxLength={20} required disabled={isLoading} />

                    <button type="submit" disabled={!username.trim() || !password.trim() || isLoading} className="login-btn">
                        {isLoading ? "Signing up..." : "Sign Up"}
                    </button>
                </form>

                {message && (
                    <p className="auth-message" style={{ color: message.includes("successful") ? "green" : "red" }}>

                    </p>
                )}
            </div>
        </div>
    );
}

export default Login;