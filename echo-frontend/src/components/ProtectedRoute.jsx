import { authService } from "../services/authService";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {

    const isAuthenticated = authService.isAuthenticated();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;