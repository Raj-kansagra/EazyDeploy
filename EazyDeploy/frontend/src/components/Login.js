import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/config.js';

const Login = ({ setToken }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      setToken(data.token);
      localStorage.setItem('token', data.token);
      navigate('/home');
    } catch (error) {
      alert('Login failed : Invalid credentials');
    }
  };

  const handleSignupRedirect = () => {
    navigate('/register');
  };

  return (
    <div className="container">
      <div className="login form">
        <header>Login</header>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input type="submit" className="button" value="Login" />
        </form>
        <div className="signup">
          <span className="signup">
            Don't have an account? 
            <button onClick={handleSignupRedirect} className="signup-button">Signup</button>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
