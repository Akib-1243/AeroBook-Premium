import axios from 'axios';

const airlineClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

airlineClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('airline_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

airlineClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('airline_token');
      localStorage.removeItem('airline_user');
      window.location.href = '/airline-login';
    }
    return Promise.reject(error);
  }
);

const unwrapError = (error) => error.response?.data || error;

export const loginAirline = async (credentials) => {
  try {
    const response = await airlineClient.post('/auth/airline-login', credentials);
    return response.data;
  } catch (error) {
    throw unwrapError(error);
  }
};

export const getAirlineFlights = async () => {
  try {
    const response = await airlineClient.get('/airline/flights');
    return response.data;
  } catch (error) {
    throw unwrapError(error);
  }
};

export const createAirlineAircraft = async (data) => {
  try {
    const response = await airlineClient.post('/airline/aircraft', data);
    return response.data;
  } catch (error) {
    throw unwrapError(error);
  }
};

export const updateAirlineFlight = async (flightId, data) => {
  try {
    const response = await airlineClient.put(`/airline/flights/${flightId}`, data);
    return response.data;
  } catch (error) {
    throw unwrapError(error);
  }
};

export const logoutAirline = async () => {
  try {
    const response = await airlineClient.post('/airline/logout');
    return response.data;
  } catch (error) {
    throw unwrapError(error);
  }
};
