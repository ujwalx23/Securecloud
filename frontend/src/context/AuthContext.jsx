import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // 1. Instant Optimistic State: read cached profile from localStorage
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('securecloud_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('securecloud_token') || null;
    } catch {
      return null;
    }
  });

  // If we already have a cached user, DO NOT block the UI! Set loading = false immediately.
  // If there is no token at all, DO NOT block the UI! Set loading = false immediately.
  // Only if token exists without any cached user, wait at most 2 seconds.
  const [loading, setLoading] = useState(() => {
    const hasToken = Boolean(localStorage.getItem('securecloud_token'));
    const hasUser = Boolean(localStorage.getItem('securecloud_user'));
    return hasToken && !hasUser;
  });

  const isFetchingRef = useRef(false);

  const fetchProfile = async (authToken) => {
    if (!authToken || isFetchingRef.current) return;
    isFetchingRef.current = true;

    const controller = new AbortController();
    // Aggressive timeout: if backend is sleeping or slow, unblock UI within 3.5s
    const timeoutId = setTimeout(() => {
      controller.abort();
      setLoading(false);
    }, 3500);

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setUser(data);
        try {
          localStorage.setItem('securecloud_user', JSON.stringify(data));
        } catch (e) {
          console.warn('LocalStorage save error:', e);
        }
      } else if (res.status === 401) {
        // Stale or revoked token
        logout();
      }
    } catch (err) {
      console.warn('Background profile sync note:', err.name === 'AbortError' ? 'Fast timeout unblock' : err.message);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (token) {
      // Fetch in background to sync profile, without blocking UI if user is already cached
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (loginIdentifier, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginIdentifier, password })
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.detail || 'Login failed');
      error.status = res.status;
      error.isUnverified = res.status === 403 && (data.detail || '').includes('verification');
      throw error;
    }
    localStorage.setItem('securecloud_token', data.access_token);
    if (data.user) {
      localStorage.setItem('securecloud_user', JSON.stringify(data.user));
      setUser(data.user);
    }
    setToken(data.access_token);
    setLoading(false);
    fetchProfile(data.access_token);
    return data;
  };

  const register = async (email, username, password, fullName) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        username,
        password,
        full_name: fullName
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Registration failed');
    }
    return data;
  };

  const verifyEmail = async (email, code) => {
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Email verification failed');
    }
    return data;
  };

  const resendCode = async (email) => {
    const res = await fetch('/api/auth/resend-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to resend code');
    }
    return data;
  };

  const loginWithGoogle = async (credential) => {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Google authentication failed');
    }
    localStorage.setItem('securecloud_token', data.access_token);
    if (data.user) {
      localStorage.setItem('securecloud_user', JSON.stringify(data.user));
      setUser(data.user);
    }
    setToken(data.access_token);
    setLoading(false);
    fetchProfile(data.access_token);
    return data;
  };

  const logout = () => {
    try {
      localStorage.removeItem('securecloud_token');
      localStorage.removeItem('securecloud_user');
    } catch {}
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      loginWithGoogle,
      verifyEmail,
      resendCode,
      logout,
      refreshProfile: () => fetchProfile(token)
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
