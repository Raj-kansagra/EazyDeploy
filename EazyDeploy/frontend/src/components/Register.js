import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/config.js';

const Register = ({ setToken }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // Add loading state
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Set loading to true when the request starts
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/register`, { name, email, password });
      setToken(data.token);
      localStorage.setItem('token', data.token);
      navigate('/verify');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        alert('User already exists. Please try logging in.');
      } else {
        alert(`Registration failed. Please try again. ${error}`);
      }
    } finally {
      setLoading(false); // Set loading to false when the request is complete
    }
  };

  const handleSigninRedirect = () => {
    navigate('/login');
  };

  return (
    <div className="container">
      <div className="login form">
        <header>Register</header>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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
          <input
            type="submit"
            className="button"
            value={loading ? 'Registering...' : 'Register'}
            disabled={loading}
          />
        </form>
        <div className="signup">
          <span className="signup">
            Already have an account? 
            <button onClick={handleSigninRedirect} className="signup-button">Signin</button>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Register;
