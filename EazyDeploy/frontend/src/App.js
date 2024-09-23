// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Projects from './components/Projects';
import './styles/App.css';
import Home from './components/Home';
import ProjectItems from './components/ProjectItems';
import Verify from './components/Verify';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  
  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
  };

  return (
    <Router>
      <Navbar isLoggedIn={token} handleLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Home/>} />
        {!token && (
          <>
          <Route path="/login" element={<Login setToken={setToken} />} />
          <Route path="/register" element={<Register setToken={setToken}/>} />
          </>
        )}
        {token && (
          <>
          <Route path="/verify" element={<Verify setToken={setToken}/>} />
          <Route path="/projects" element={<Projects/>} />
          <Route path="/projects/:id" element={<ProjectItems/>} />
          </>
        )}
        <Route path="*" element={<Home/>} />
      </Routes>
    </Router>
  );
}

export default App;
