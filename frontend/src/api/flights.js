const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const getAirports = async () => {
  const response = await fetch(`${API_BASE_URL}/airports`);

  if (!response.ok) {
    throw new Error('Airport list could not be loaded');
  }

  return response.json();
};

export const searchFlights = async ({
  origin,
  destination,
  date,
  time,
  passengers,
}) => {
  const params = new URLSearchParams({
    origin,
    destination,
    date,
    time,
    passengers: String(passengers),
  });

  const response = await fetch(
    `${API_BASE_URL}/flights/search?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error('Flight search failed');
  }

  return await response.json();
};