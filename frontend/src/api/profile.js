import axiosClient from './axiosClient';

const request = async (method, url, data) => {
  try {
    const response = method === 'delete' && data
      ? await axiosClient.delete(url, { data })
      : await axiosClient[method](url, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getProfileDetails = () => request('get', '/profile');
export const saveProfileDetails = (data) => request('put', '/profile/details', data);
export const sendEmailVerificationCode = (email) => request('post', '/profile/email/request-code', { email });
export const verifyProfileEmail = (code) => request('post', '/profile/email/verify', { code });
export const saveNotificationPreferences = (data) => request('put', '/profile/preferences', data);
export const addSavedTraveler = (data) => request('post', '/profile/travelers', data);
export const updateSavedTraveler = (id, data) => request('put', `/profile/travelers/${id}`, data);
export const removeSavedTraveler = (id) => request('delete', `/profile/travelers/${id}`);
export const getProfileSessions = () => request('get', '/profile/sessions');
export const revokeProfileSession = (id) => request('delete', `/profile/sessions/${id}`);
export const changeAccountPassword = (data) => request('post', '/profile/change-password', data);
export const deleteProfileAccount = (password) => request('delete', '/profile/account', { password });
