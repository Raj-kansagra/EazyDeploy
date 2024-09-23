import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/config.js';

const Verify = ({ setToken }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/verify`, { email, otp });
      setToken(data.token);
      localStorage.setItem('token', data.token);
      navigate('/home');
    } catch (error) {
        if (error.response && error.response.status === 401) {
            alert("Invalid email");
        } else if (error.response && error.response.status === 400) {
            alert("Invalid or expired OTP");
        } else {
            alert(`Registration failed. Please try again. ${error}`);
        }
    }
  };

  return (
    <div className="container">
      <div className="login form">
        <header>Verify your email</header>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            placeholder="OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
          <input type="submit" className="button" value="Verify" />
        </form>
      </div>
    </div>
  );
};

export default Verify;
