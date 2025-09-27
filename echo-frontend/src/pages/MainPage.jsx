import React from 'react'
import { useNavigate } from 'react-router-dom';
import '../styles/MainPage.css';

function MainPage() {

    const navigate = useNavigate()
    const handleGettingStarted = () => {
        navigate('/signup');
    }

    const handleLearnMore = () => {
        window.open('https://www.google.com', '_blank');
    }

  return (
    <div className="mainpage-container">
        <div className="mainpage-title">
            <div className="mainpage-button">
                <button className='btn btn-primary' onClick={handleGettingStarted}>Getting Started</button>
                <button className='btn btn-secondary' onClick={handleLearnMore}>Learn More</button>
            </div>
        </div>
    </div>
  )
}

export default MainPage;
