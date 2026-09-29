import { useCallback, useEffect, useState } from 'react';
import { getSeatMap } from '../api/flights';

// Reloads seat statuses every few seconds so seats held by others turn amber,
// sold seats turn grey and expired holds turn green again without a page refresh.
export default function useSeatAvailability(flightId, intervalMs = 8000) {
  const [flight, setFlight] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const result = await getSeatMap(flightId);
      setFlight(result.flight);
      setSeats(result.seats || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Seat map could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [flightId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  return { flight, seats, loading, error, refresh };
}
