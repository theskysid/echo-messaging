import {BrowserRouter as Router, Routes, Route} from "react-router-dom";
import { Navigate } from "react-router-dom";
import './App.css';
import Navbar from './components/Navbar';
import MainPage from './pages/MainPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ChatArea from './pages/ChatArea';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App(){
    return(
        <Router>
            <div className="app">
                <Navbar />
                    <Routes>
                        <Route path="/" element= {<MainPage/>} />
                        <Route path="/login" element= {<Login/>} />
                        <Route path="/signup" element= {<Signup/>} />
                        <Route path="/chatarea" element= {
                            <ProtectedRoute>
                                <ChatArea />
                            </ProtectedRoute>
                        } />

                        {/* If user hits any other link then this lines handlles it and transfers it to '/' */}
                        <Route path="*" element={<Navigate to = "/" replace />}></Route> 
                    
                    </Routes>

            </div>

        </Router>
    )
}

export default App;