// Import React hooks for state and effect management
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create context object for storing auth state globally
const AuthContext = createContext();

// Custom hook to access auth context throughout the app
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// LocalStorage keys for persisting user data and auth token
const USER_KEY  = 'nexus_user';
const TOKEN_KEY = 'nexus_token';
const API_BASE  = '/api/auth';

// Load user data from localStorage, with error handling for corrupted data
function loadStored() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Load auth token from localStorage
function loadToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

// AuthProvider: Manages authentication state and provides auth methods to all child components
export const AuthProvider = ({ children }) => {
  // Load initial state from localStorage or set to null
  const [user, setUser]   = useState(loadStored);
  const [token, setToken] = useState(loadToken);
  const [loading, setLoading] = useState(false);

  // Sync user data to localStorage whenever it changes
  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  // Sync auth token to localStorage whenever it changes
  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  // On component mount, verify stored token is still valid with the server
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    // Call /me endpoint to validate token and get fresh user data
    fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error('Token expired');
        return r.json();
      })
      .then(data => {
        // Update user data if validation succeeds
        if (data.user) setUser(data.user);
      })
      .catch(() => {
        // Token invalid — keep user from localStorage as fallback
        // (server might just be offline; don't force logout)
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Register new user with email, password, and profile info
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
      // Store token and user data after successful registration
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Login with email and password, or accept user object for legacy/mock login
  const login = useCallback(async (emailOrUserData, password) => {
    // Support both new API login AND legacy mock login (for backward compat)
    if (typeof emailOrUserData === 'object' && !password) {
      // Legacy mock login — called directly with a user object, skips API call
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
      // Store token and user data after successful login
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Update user profile with new fields
  const updateProfile = useCallback(async (fields) => {
    if (!token) {
      // Offline/mock mode — just update localStorage without API call
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
      // Update local user state with server response
      setUser(data.user);
      return { success: true };
    } catch (err) {
      // Fallback: update locally if API fails
      setUser(prev => ({ ...prev, ...fields }));
      return { success: true, offline: true };
    }
  }, [token]);

  // Clear user and token data (logout)
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  // Provide auth context to all child components
  return (
    <AuthContext.Provider
      value={{
        user,        // Current authenticated user object
        token,       // JWT token for API requests
        loading,     // Boolean indicating if auth operation is in progress
        login,       // Function to login user
        register,    // Function to register new user
        logout,      // Function to logout user
        updateProfile, // Function to update user profile
        isAuthenticated: !!user, // Boolean helper to check if user is logged in
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
