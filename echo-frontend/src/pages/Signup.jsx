import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {authService} from "../services/authService.js";

const Signup = () => {

    const[username, setUsername] = useState("");
    const[email, setEmail] = useState("");
    const[password, setPassword] = useState("");
    const[message, setMessage] = useState("");
    const[isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();


    const handleSignup = async(e) => {
        e.preventDefault();
        setMessage("");    
        setIsLoading(true);

        try {
            const result = await authService.signup({username, email, password});
            if(result.success) {
                setMessage("Account created successfully...");
                setTimeout(() => {
                    navigate("/login");
                }, 2000); //2 seconds delay before redirecting to login
            }
        } catch (error) {
            setMessage(error.message || "Signup failed. Please try again.");
            console.error("Signup Error:", error);
        }
        
    }

    return (
        <div className="signup-container">
            <div className="signup-box">
                <div className="signup-header">
                    <h1>SignUp</h1>
                    <p>Create an account to start chatting</p>
                </div>

                <form action="" onSubmit={handleSignup} className="signup-form">
                    <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="username-input" maxLength={20} required disabled={isLoading} />

                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="email-input" maxLength={50} required disabled={isLoading} />

                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="password-input" maxLength={20} required disabled={isLoading} />

                    <button type="submit" disabled={!username.trim() || !email.trim() || !password.trim() || isLoading} className="join-btn">
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

export default Signup;