import axiosClient from './axiosClient';

const normalizeStoredUser = (user) => {
  if (!user) return user;

  return {
    ...user,
    passport: user.passport ?? user.passenger?.passport ?? null,
  };
};

export const register = async (userData) => {
  try {
    const response = await axiosClient.post('/auth/register', userData);
    const token = response.data.access_token || response.data.token;
    if (token) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(normalizeStoredUser(response.data.user)));
    }
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const login = async (credentials) => {
  try {
    const response = await axiosClient.post('/auth/login', credentials);
    const token = response.data.access_token || response.data.token;
    if (token) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(normalizeStoredUser(response.data.user)));
    }
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const adminLogin = async (credentials) => {
  try {
    const response = await axiosClient.post('/auth/admin-login', credentials);
    const token = response.data.access_token || response.data.token;
    if (token) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(normalizeStoredUser(response.data.user)));
    }
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const logout = async () => {
  try {
    await axiosClient.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }
};

export const requestPasswordReset = async (resetRequest) => {
  try {
    const payload = typeof resetRequest === 'string' ? { email: resetRequest } : resetRequest;
    const response = await axiosClient.post('/auth/password/request-code', payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const resetPassword = async (resetData) => {
  try {
    const response = await axiosClient.post('/auth/password/reset', resetData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await axiosClient.get('/auth/me');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const updateProfile = async (profileData) => {
  try {
    const response = await axiosClient.put('/auth/profile', profileData);
    const user = normalizeStoredUser(response.data.user);
    localStorage.setItem('user', JSON.stringify(user));
    return { ...response.data, user };
  } catch (error) {
    throw error.response?.data || error;
  }
};
