import { createContext, useContext, useState, useEffect } from 'react';
import * as authAPI from '../api/auth';

const AuthContext = createContext();

const normalizeUser = (user) => {
  if (!user) return user;

  return {
    ...user,
    passport: user.passport ?? user.passenger?.passport ?? null,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(normalizeUser(JSON.parse(storedUser)));
    }
    setLoading(false);
  }, []);

  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authAPI.register(userData);
      const normalizedToken = response.access_token || response.token;

      if (normalizedToken) {
        setToken(normalizedToken);
      }

      if (response.user) {
        setUser(normalizeUser(response.user));
      }

      return response;
    } catch (err) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authAPI.login(credentials);
      const normalizedToken = response.access_token || response.token;

      if (normalizedToken) {
        setToken(normalizedToken);
      }

      if (response.user) {
        setUser(normalizeUser(response.user));
      }

      return response;
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      setLoading(true);
      await authAPI.logout();
      setToken(null);
      setUser(null);
    } catch (err) {
      const errorMessage = err.message || 'Logout failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isAuthenticated = !!token && !!user;

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
