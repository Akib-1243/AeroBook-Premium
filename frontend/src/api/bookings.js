import axiosClient from './axiosClient';

export const getMyBookings = async () => {
  try {
    const response = await axiosClient.get('/bookings');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const createBooking = async (flightId, travelerId = null) => {
  try {
    const response = await axiosClient.post('/bookings', {
      flight_id: flightId,
      traveler_id: travelerId || null,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getBookingById = async (bookingId) => {
  try {
    const response = await axiosClient.get(`/bookings/${bookingId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
