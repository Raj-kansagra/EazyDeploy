import React from 'react';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();

  const handleDeployClick = () => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      navigate('/projects');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className='hero-container'>
      <div className="hero">
        <h1 className="hero__title">Your fastest path to production</h1>
        <p className="hero__text">
        Build, deploy, and scale your Express and React apps with unmatched ease from your very first user to your billionth.
        </p>
        <div className="hero__buttons">
          <button className="hero__button" onClick={handleDeployClick}>
            Start Deploying
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
