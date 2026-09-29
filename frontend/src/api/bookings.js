import axiosClient from './axiosClient';

export const getMyBookings = async () => {
  try {
    const response = await axiosClient.get('/bookings');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// mode 'book' holds the seats until paid; 'buy' pays now and tickets immediately.
export const createBooking = async (flightId, seatIds = [], mode = 'book') => {
  try {
    const payload = { flight_id: flightId, mode };
    if (seatIds.length) payload.seat_ids = seatIds;
    const response = await axiosClient.post('/bookings', payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const payBooking = async (bookingId) => {
  try {
    const response = await axiosClient.post(`/bookings/${bookingId}/pay`);
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
