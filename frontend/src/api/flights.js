const API_BASE_URL = 'http://localhost:8000/api';

export const buildFlightSearchParams = ({
  origin,
  destination,
  date,
  time,
  passengers,
  filters = {},
}) => {
  const safePassengers = Number(passengers) > 0 ? Number(passengers) : 1;
  const params = new URLSearchParams();

  if (origin) params.set('origin', origin);
  if (destination) params.set('destination', destination);
  if (date) params.set('date', date);
  if (time) params.set('time', time);
  params.set('passengers', String(safePassengers));

  if (filters.stops && filters.stops !== 'all') params.set('stops', filters.stops);
  if (filters.minPrice !== undefined && filters.minPrice !== null) {
    params.set('min_price', String(filters.minPrice));
  }
  if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
    params.set('max_price', String(filters.maxPrice));
  }
  if (filters.sort) params.set('sort', filters.sort);
  filters.airlines?.forEach((airline) => params.append('airlines[]', airline));
  filters.departurePeriods?.forEach((period) => params.append('departure_periods[]', period));
  filters.arrivalPeriods?.forEach((period) => params.append('arrival_periods[]', period));

  return params;
};

export const getAirports = async () => {
  const response = await fetch(`${API_BASE_URL}/airports`);

  if (!response.ok) {
    throw new Error('Airport list could not be loaded');
  }

  return response.json();
};

export const getSeatMap = async (flightId) => {
  const response = await fetch(`${API_BASE_URL}/flights/${flightId}/seatmap`);

  if (!response.ok) {
    throw new Error('Seat map could not be loaded');
  }

  return response.json();
};

export const searchFlights = async ({
  origin,
  destination,
  date,
  time,
  passengers,
  filters,
}) => {
  const params = buildFlightSearchParams({
    origin,
    destination,
    date,
    time,
    passengers,
    filters,
  });

  const response = await fetch(
    `${API_BASE_URL}/flights/search?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error('Flight search failed');
  }

  return await response.json();
};