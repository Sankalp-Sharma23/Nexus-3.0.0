import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const USER_KEY  = 'nexus_user';
const TOKEN_KEY = 'nexus_token';
const API_BASE  = '/api/auth';

function loadStored() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser]   = useState(loadStored);
  const [token, setToken] = useState(loadToken);
  const [loading, setLoading] = useState(false);

  // Keep localStorage in sync whenever user/token changes
  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  // On mount, verify token is still valid
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error('Token expired');
        return r.json();
      })
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {
        // Token invalid — keep user from localStorage as fallback
        // (server might just be offline; don't force logout)
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const register = useCallback(async ({ name, email, password, gender, focus, focusLabel }) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, gender, focus, focusLabel }),
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON body */ }
      if (!res.ok) throw new Error(data.error || `Registration failed (${res.status})`);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (emailOrUserData, password) => {
    // Support both new API login AND legacy mock login (for backward compat)
    if (typeof emailOrUserData === 'object' && !password) {
      // Legacy mock login — called directly with a user object
      setUser(emailOrUserData);
      return { success: true };
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailOrUserData, password }),
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON body */ }
      if (!res.ok) throw new Error(data.error || `Login failed (${res.status})`);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (fields) => {
    if (!token) {
      // Offline/mock mode — just update localStorage
      setUser(prev => ({ ...prev, ...fields }));
      return { success: true };
    }

    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fields),
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON body */ }
      if (!res.ok) throw new Error(data.error || `Update failed (${res.status})`);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      // Fallback: update locally
      setUser(prev => ({ ...prev, ...fields }));
      return { success: true, offline: true };
    }
  }, [token]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateProfile,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
