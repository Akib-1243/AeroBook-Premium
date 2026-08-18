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

export const getCurrentUser = async () => {
  try {
    const response = await axiosClient.get('/auth/me');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
