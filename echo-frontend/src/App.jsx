import {BrowserRouter as Router, Routes, Route} from "react-router-dom";
import Navbar from './components/Navbar';
import MainPage from './pages/MainPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';

function App(){
    return(
        <Router>

            <div className="app">
                
                <Navbar>

                    <Routes>
                        <Route poth="/" element= {<MainPage/>} />
                        <Route poth="/login" element= {<Login/>} />
                        <Route poth="/signup" element= {<Signup/>} />
                        <Route poth="/chatarea" element= {
                            <ProtectedRoute>
                                <Chat />
                            </ProtectedRoute>
                        } />

                        {/* If user hits any other link then this lines handlles it and transfers it to '/' */}
                        <Route path="*" element={<Navigate to = "/" replace />}></Route> 
                    
                    </Routes>

                    
                </Navbar>

            </div>

        </Router>
    )
}

export default App;