import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

const NavBar = ({ isLoggedIn, handleLogout }) => {
  const [click, setClick] = useState(false);

  const handleClick = () => setClick(!click);

  return (
    <nav className="navbar">
      <div className="nav-container">
        <NavLink to="/" className="nav-logo">
          <span>EazyDeploy</span>
        </NavLink>

        <ul className={click ? 'nav-menu active' : 'nav-menu'}>
          <li className="nav-item">
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? 'nav-links active' : 'nav-links')}
              onClick={handleClick}
            >
              Home
            </NavLink>
          </li>
          {isLoggedIn && (
            <li className="nav-item">
              <NavLink
                to="/projects"
                className={({ isActive }) => (isActive ? 'nav-links active' : 'nav-links')}
                onClick={handleClick}
              >
                Projects
              </NavLink>
            </li>
          )}
          {!isLoggedIn ? (
            <>
              <li className="nav-item">
                <NavLink
                  to="/login"
                  className={({ isActive }) => (isActive ? 'nav-links active' : 'nav-links')}
                  onClick={handleClick}
                >
                  Login
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/register"
                  className={({ isActive }) => (isActive ? 'nav-links active' : 'nav-links')}
                  onClick={handleClick}
                >
                  Register
                </NavLink>
              </li>
            </>
          ) : (
            <li className="nav-item">
              <button
                onClick={handleLogout}
                className="btn nav-links"
              >
                Logout
              </button>
            </li>
          )}
        </ul>

        <div className="nav-icon" onClick={handleClick}>
          {click ? (
            <span className="icon">
              <CloseIcon />
            </span>
          ) : (
            <span className="icon">
              <MenuIcon />
            </span>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
