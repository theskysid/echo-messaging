import axios from "axios";

const API_URL = 'https://localhost:8080';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true
});

//response Intercepter for globval error handling 

api.interceptors.response.use(
    (response) => response,
    (error) => {

        //gloabl error handling
        if(error.response){
            switch(error.response.status){
                case 401: //unauthorized
                    authService.logout();
                    window.location.href='/login'
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
            const response = await api.post('/auth/login', {username, password});

            //after succerssful login store the user data in local storage
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
            throw errorMessage = error.response?.data?.message || "Login failed. Please check your credentials."; 
            throw new errorMessage;
        }
    },

    signup: async({username, email, password}) => {
        try {
            const response = await api.post('/auth/signup', {
                username, 
                email, 
                password
            });
            return {
                success: true,
                user: response.data
            };
        } catch (error) {
             console.error("Signup failed:", error);
            throw errorMessage = error.response?.data?.message || "Signup failed. Please check your credentials."; 
            throw new errorMessage;
        }
    },
    
    logout: async() => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error("Logout failed:", error);
            throw error;
        } finally {
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
        const user = localStorage.getItem('user') || localStorage.getItem('currentUser'); //check either user or currentUser exists

        return !!user; //return true if user exists, else false
    },

    fetchPrivateMessages: async() => {
        try {
            const response = await api.get('/api/messages/private?user1=${encodeURIComponent(user1)} & user2=${encodeURIComponent(user2)}'); 
            return response.data;
        } catch (error) {
            console.error("Fetch private messages failed:", error);
            throw error;
        }
    },

    getOnlineUsers: async() => {
        try {
            const response = await api.get('/api/online-users');
            return response.data;
        } catch (error) {
            console.error("Fetch online users failed:", error);
            throw error;
        }
    }

}