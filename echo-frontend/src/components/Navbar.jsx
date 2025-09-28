import { useNavigate, Link } from "react-router-dom";
import { authService } from "../services/authService.js";
import '../styles/Navbar.css';

const Navbar = () => {
    const navigate = useNavigate();
    const isAuthenticated = authService.isAuthenticated();
    const currentUser = authService.getCurrentUser();

    // Debug logging
    console.log("Navbar - isAuthenticated:", isAuthenticated);
    console.log("Navbar - currentUser:", currentUser);

    const handleLogout = async() => {
        try{
            await authService.logout();
            navigate("/login");
        } catch (error) {
            console.error('Logout Failed', error);
            localStorage.clear();
            navigate('/login');
        }
    }

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-brand">
                    Chat Application 
                </Link>

                <div className="navbar-menu">
                    {isAuthenticated ? (
                        
                        <>
                            <Link to="/chatarea" className="navbar-link">
                                Chat Area
                            </Link>
                            <div className="navbar-user">
                                <span className="user-info">
                                    Welcome, {currentUser?.username || 'User'}!
                                </span>
                                <button className="logout-btn" onClick={handleLogout}>Logout</button>
                            </div>
                        </>

                    ) : (
                        <>
                            <Link to="/login" className="navbar-link">Login</Link>
                            <Link to="/signup" className="navbar-link">Signup</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}

export default Navbar;