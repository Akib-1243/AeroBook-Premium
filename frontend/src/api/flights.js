const API_BASE_URL = 'http://localhost:8000/api';

export const buildFlightSearchParams = ({
  origin,
  destination,
  date,
  time,
  passengers,
}) => {
  const safePassengers = Number(passengers) > 0 ? Number(passengers) : 1;
  const params = new URLSearchParams();

  if (origin) params.set('origin', origin);
  if (destination) params.set('destination', destination);
  if (date) params.set('date', date);
  if (time) params.set('time', time);
  params.set('passengers', String(safePassengers));

  return params;
};

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
  const params = buildFlightSearchParams({
    origin,
    destination,
    date,
    time,
    passengers,
  });

  const response = await fetch(
    `${API_BASE_URL}/flights/search?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error('Flight search failed');
  }

  return await response.json();
};