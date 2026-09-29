import axiosClient from './axiosClient';

const request = async (method, url, data) => {
  try {
    const response = await axiosClient[method](url, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getTransactions = () => request('get', '/account/transactions');
export const getSavedPaymentMethods = () => request('get', '/account/payment-methods');
export const tokenizeSandboxPaymentMethod = (data) => request('post', '/account/payment-methods/tokenize', data);
export const setDefaultPaymentMethod = (id) => request('put', `/account/payment-methods/${id}/default`);
export const removeSavedPaymentMethod = async (id) => {
  try {
    const response = await axiosClient.delete(`/account/payment-methods/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
export const getRefundRequests = () => request('get', '/account/refunds');
export const cancelBooking = (id, reason = '') => request('post', `/bookings/${id}/cancel`, { reason });
