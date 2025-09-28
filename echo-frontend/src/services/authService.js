import axios from "axios";

const API_URL = 'http://localhost:8080/';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add request interceptor to include JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        console.log(`🔧 Request to ${config.url} - Token:`, token ? `${token.substring(0, 20)}...` : 'null');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log(`🔧 Added Authorization header: Bearer ${token.substring(0, 20)}...`);
        } else {
            console.log("⚠️ No token found in localStorage");
        }
        return config;
    },
    (error) => Promise.reject(error)
);

//response Intercepter for globval error handling 

api.interceptors.response.use(
    (response) => response,
    (error) => {

        //gloabl error handling
        if(error.response){
            switch(error.response.status){
                case 401: //unauthorized
                    authService.logout();
                    window.location.href='/api/login'
                    break
                case 403: //access forbidden 
                    console.error("Access Forbidden");
                    break;
                case 404: //Resource not found
                    console.error("Resource not found");
                    break;
                case 500: //internal server error
                    console.error("Internal Server error");
                    break;

            }


           
            
        } else if(error.request){
            console.error("Request made but did not receive any response" + error.request);
        } else {
            console.error("Something went wrong in setting up the request" + error.message);
        }
        
        return Promise.reject(error);
    }
);

//generate the random color for user
const generateUserColor = () => {
    const colors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080'];
    return colors[Math.floor(Math.random() * colors.length)];
}

export const authService = {
    login: async({username, password}) => {
        try {
            const response = await api.post('/api/auth/login', {username, password});

            // Store JWT token and user data
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
            } else {
                // If no token, create a temporary one for demo purposes
                localStorage.setItem('token', 'demo-token-' + Date.now());
            }
            
            const userColor = generateUserColor();
            const userData = {
                ...response.data,
                color: userColor,
                loginTime: new Date().toISOString()
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('user', JSON.stringify(response.data));

            return {
                success: true,
                data: userData
            };
        } catch (error) {
            console.error("Login failed:", error);
            const errorMessage = error.response?.data?.message || "Login failed. Please check your credentials.";
            throw new Error(errorMessage);
        }
    },

    signup: async({username, email, password}) => {
        try {
            const response = await api.post('/api/auth/register', {
                username, 
                email, 
                password
            });
            
            // Store JWT token if provided
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
            } else {
                // If no token, create a temporary one for demo purposes
                localStorage.setItem('token', 'demo-token-' + Date.now());
            }
            
            return {
                success: true,
                user: response.data
            };
        } catch (error) {
             console.error("Signup failed:", error);
            const errorMessage = error.response?.data?.message || "Signup failed. Please check your credentials.";
            throw new Error(errorMessage);
        }
    },
    
    logout: async() => {
        try {
            await api.post('/api/auth/logout');
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('user');
        }
    },
    
    fetchCurrentUser: async() => {
        try {
            const response = await api.get('/auth/getcurrentuser');

            localStorage.setItem('user', JSON.stringify(response.data));
            
            return response.data;
        } catch (error) {
            console.error("Fetch current user failed:", error);
            
            //if unauthorized, logout the user
            if(error.response && error.response.status === 401){
                authService.logout();
                window.location.href = '/login';
            }

        }
    },

    getCurrentUser: () => {
        const currentUserStr = localStorage.getItem('currentUser');
        const userStr = localStorage.getItem('user');

        try {
            if(currentUserStr){
                return JSON.parse(currentUserStr);
            } else if(userStr){
                const userData = JSON.parse(userStr);
                const userColor = generateUserColor();
                
                return {
                    ...userData,
                    color: userColor,
                    loginTime: new Date().toISOString()
                };
            }
            return null;    
        } catch (error) {
            console.error("Error parsing user data from localStorage:", error);
            return null;
        }
    },

    isAuthenticated: () => {
        const token = localStorage.getItem('token');
        return !!token; //return true if token exists, else false
    },

    getToken: () => {
        return localStorage.getItem('token');
    },

    fetchPrivateMessages: async (user1, user2) => {
        try {
            const response = await api.get(`/api/messages/private?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`); 
            return response.data;
        } catch (error) {
            console.error("Fetch private messages failed:", error);
            throw error;
        }
    },

    getOnlineUsers: async() => {
        try {
            const token = localStorage.getItem('token');
            console.log("🔑 Token from localStorage:", token ? `${token.substring(0, 20)}...` : 'null');
            console.log("🌐 Making API call to /api/online-users");
            
            const response = await api.get('/api/online-users');
            console.log("🌐 API Response status:", response.status);
            console.log("🌐 API Response data:", response.data);
            return response.data;
        } catch (error) {
            console.error("❌ Fetch online users failed:", error);
            console.error("❌ Error response:", error.response?.data);
            console.error("❌ Error status:", error.response?.status);
            console.error("❌ Request headers:", error.config?.headers);
            throw error;
        }
    }

}