import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createBooking } from '../api/bookings';
import useSeatAvailability from '../hooks/useSeatAvailability';
import SeatMap, { SeatLegend } from '../components/booking/SeatMap';
import {
  pruneSelection,
  seatPriceLabel,
  selectionCounter,
  toggleSeat,
} from '../components/booking/seatMapUtils';
import SiteFooter from '../components/SiteFooter';

function SeatSelectionPage() {
  const { flightId } = useParams();
  const [searchParams] = useSearchParams();
  const passengers = Math.min(Math.max(Number(searchParams.get('passengers')) || 1, 1), 9);

  const { flight, seats, loading, error, refresh } = useSeatAvailability(flightId);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [selectedIds, setSelectedIds] = useState([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(null); // 'book' | 'buy' while a request is in flight

  // A live refresh may show that someone else took a seat this user had picked.
  useEffect(() => {
    const { selected, lost } = pruneSelection(selectedIds, seats);
    if (lost.length) {
      setSelectedIds(selected);
      setMessage(`Seat ${lost.join(', ')} was just taken. Please choose another seat.`);
    }
  }, [seats]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = (seat) => {
    const result = toggleSeat(selectedIds, seat, passengers);
    setSelectedIds(result.selected);
    setMessage(result.error);
  };

  const handleSubmit = async (mode) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setSubmitting(mode);
    setMessage('');
    try {
      const result = await createBooking(Number(flightId), selectedIds, mode);
      navigate('/my-bookings', { state: { notice: result.message } });
    } catch (err) {
      setMessage(err.message || 'This seat was just taken. Please choose another seat.');
      setSelectedIds([]);
      refresh();
    } finally {
      setSubmitting(null);
    }
  };

  const selectedSeats = seats.filter((seat) => selectedIds.includes(seat.id));

  return (
    <div className="seat-selection-page">
      <nav className="navbar">
        <div className="logo">✈ AeroBook</div>
        <div className="nav-links">
          <Link to="/home">Home</Link>
          <Link to="/my-bookings">My Bookings</Link>
        </div>
      </nav>

      <main className="seat-selection">
        <header className="seat-selection__header">
          <Link to="/home" className="seat-selection__back">← Back to search</Link>
          <h1>Choose your seats</h1>
          {flight && (
            <p>
              {flight.origin} to {flight.destination} ·{' '}
              {new Date(flight.departure).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · {flight.aircraft_model}
            </p>
          )}
        </header>

        {loading && <p>Loading seat map…</p>}
        {error && <p className="seat-selection__error" role="alert">{error}</p>}

        {!loading && !error && (
          <div className="seat-selection__layout">
            <section className="seat-selection__cabin">
              <SeatMap seats={seats} selectedIds={selectedIds} onToggle={handleToggle} />
            </section>

            <aside className="seat-selection__side">
              <SeatLegend />

              <div className="seat-summary">
                <p className="seat-summary__counter" aria-live="polite">
                  {selectionCounter(selectedIds.length, passengers)}
                </p>
                {selectedSeats.length > 0 && (
                  <ul>
                    {selectedSeats.map((seat) => (
                      <li key={seat.id}>
                        <strong>{seat.number}</strong> {seat.position}
                        <span>{seatPriceLabel(seat)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {message && <p className="seat-selection__error" role="alert">{message}</p>}
                <div className="seat-summary__actions">
                  <button
                    type="button"
                    className="login-btn"
                    disabled={selectedIds.length !== passengers || Boolean(submitting)}
                    onClick={() => handleSubmit('book')}
                    title="Reserve the seats now and pay later from My Bookings"
                  >
                    {submitting === 'book' ? 'Booking…' : 'Book (pay later)'}
                  </button>
                  <button
                    type="button"
                    className="search-btn"
                    disabled={selectedIds.length !== passengers || Boolean(submitting)}
                    onClick={() => handleSubmit('buy')}
                    title="Pay now and get your ticket immediately"
                  >
                    {submitting === 'buy' ? 'Processing…' : 'Buy now'}
                  </button>
                </div>
                <p className="seat-summary__hint">
                  Book holds your seats until you pay from My Bookings. Unpaid holds are released
                  automatically.
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

export default SeatSelectionPage;
