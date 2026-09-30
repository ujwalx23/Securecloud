import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const DEMO_USER = {
  id: 'demo-user-001',
  email: 'admin@securecloud.io',
  full_name: 'Alex Mercer (Demo Mode)',
  storage_used_bytes: 2.4 * 1024 * 1024 * 1024,
  storage_quota_bytes: 15 * 1024 * 1024 * 1024,
  created_at: new Date().toISOString(),
  is_demo: true,
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('securecloud_token') || null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const fetchProfile = async (authToken) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Login failed');
    }
    localStorage.setItem('securecloud_token', data.access_token);
    setToken(data.access_token);
    await fetchProfile(data.access_token);
  };

  const register = async (email, password, fullName) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Registration failed');
    }
    // Auto login
    await login(email, password);
  };

  const demoLogin = () => {
    setUser(DEMO_USER);
    setToken('demo-token');
    setIsDemoMode(true);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('securecloud_token');
    setToken(null);
    setUser(null);
    setIsDemoMode(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, demoLogin, isDemoMode, refreshProfile: () => fetchProfile(token) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
