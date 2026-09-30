import axiosClient from './axiosClient';

export const getMyBookings = async () => {
  try {
    const response = await axiosClient.get('/bookings');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// mode 'book' holds the seats until paid; 'buy' charges the saved payment method now.
// With no seatIds the server assigns the next available seat.
export const createBooking = async (flightId, { seatIds = [], mode = 'book', travelerId = null, paymentMethodId = null } = {}) => {
  try {
    const payload = { flight_id: flightId, mode, traveler_id: travelerId || null };
    if (seatIds.length) payload.seat_ids = seatIds;
    if (paymentMethodId) payload.payment_method_id = paymentMethodId;
    const response = await axiosClient.post('/bookings', payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const payBooking = async (bookingId, paymentMethodId) => {
  try {
    const response = await axiosClient.post(`/bookings/${bookingId}/pay`, { payment_method_id: paymentMethodId });
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
