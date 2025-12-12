import React, { createContext, useState, useEffect, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(localStorage.getItem('access'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh'));
  
  // ✅ Calculer userId avec useMemo pour éviter les recalculs
  const userId = useMemo(() => {
    try {
      return accessToken ? jwtDecode(accessToken).id : null;
    } catch {
      return null;
    }
  }, [accessToken]);
  
  const isLoggedIn = !!accessToken;

  const login = (newAccessToken, newRefreshToken) => {
    localStorage.setItem('access', newAccessToken);
    localStorage.setItem('refresh', newRefreshToken);
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
  };

  const logout = async () => {
    if (accessToken) {
      try {
        await fetch(`${process.env.REACT_APP_API_URL}/api/users/me/active`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ isActive: false })
        });

        await fetch(`${process.env.REACT_APP_API_URL}/api/users/logout`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${accessToken}` 
          },
          body: JSON.stringify({ userId })
        });
      } catch (err) {
        console.error("Erreur logout serveur :", err);
      }
    }
    
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    setAccessToken(null);
    setRefreshToken(null);
  };

  const refreshAccessToken = async () => {
    if (!refreshToken) {
      logout();
      return null;
    }
    
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/users/token/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      
      if (!res.ok) throw new Error('Refresh token failed');
      
      const data = await res.json();
      localStorage.setItem('access', data.access);
      setAccessToken(data.access);
      return data.access;
    } catch (err) {
      console.error(err);
      logout();
      return null;
    }
  };

  // Synchronisation multi-onglets
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'access') {
        setAccessToken(e.newValue);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      isLoggedIn, 
      accessToken, 
      userId, 
      login, 
      logout, 
      refreshAccessToken 
    }}>
      {children}
    </AuthContext.Provider>
  );
};