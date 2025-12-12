import { useNavigate, Link } from "react-router-dom";
import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Menu, X } from "lucide-react";
import "./header.css";

function Header() {
  const navigate = useNavigate();
  const { isLoggedIn, logout, userId } = useContext(AuthContext);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <header className="header-container">
      <h2 id="header-title">PictText</h2>

      {/* Burger menu button (mobile only) */}
      <button 
        className="burger-btn" 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* Navigation menu */}
      <nav className={`nav-menu ${mobileMenuOpen ? "open" : ""}`}>
        {isLoggedIn ? (
          <>
            <Link to="/home" onClick={() => setMobileMenuOpen(false)}>Accueil</Link>
            <Link to="/contacts" onClick={() => setMobileMenuOpen(false)}>Mes contacts</Link>
            <Link to="/news-feed" onClick={() => setMobileMenuOpen(false)}>Mon fil d'actualités</Link>
            <Link to="/conversations" onClick={() => setMobileMenuOpen(false)}>Mes conversations</Link>

            <div 
              className="profile-menu-container" 
              onMouseEnter={() => !isMobile && setProfileMenuOpen(true)}
              onMouseLeave={() => !isMobile && setProfileMenuOpen(false)}
            >
              <button
                className="profile-link"
                onClick={() => isMobile && setProfileMenuOpen(!profileMenuOpen)}
              >
                Mon profil ▾
              </button>

              {(profileMenuOpen) && (
                <ul className={`profile-dropdown ${profileMenuOpen ? "open" : ""}`}>
                  <li>
                    <button onClick={() => { navigate("/profile/" + userId); setMobileMenuOpen(false); }}>
                      Voir mon profil
                    </button>
                  </li>
                  <li>
                    <button onClick={() => { navigate("/edit-profile"); setMobileMenuOpen(false); }}>
                      Modifier mes informations
                    </button>
                  </li>
                  <li>
                    <button onClick={handleLogout}>Se déconnecter</button>
                  </li>
                </ul>
              )}
            </div>
          </>
        ) : (
          <div className="authentication">
            <button onClick={() => {
              navigate("/home");
              setMobileMenuOpen(false);
            }}>
                Accueil
            </button>
            <button onClick={() => {
              navigate("/signup");
              setMobileMenuOpen(false);
            }}>
              S'inscrire
            </button>
            <button onClick={() => {
              navigate("/login");
              setMobileMenuOpen(false);
            }}>
              Se connecter
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}

export default Header;
