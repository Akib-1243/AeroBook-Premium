import axiosClient from './axiosClient';

export const getAdminDashboard = async () => {
  try {
    const response = await axiosClient.get('/admin/dashboard');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
