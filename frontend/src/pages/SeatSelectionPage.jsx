import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createBooking } from '../api/bookings';
import useSeatAvailability from '../hooks/useSeatAvailability';
import SeatMap, { SeatLegend } from '../components/booking/SeatMap';
import CheckoutModal from '../components/booking/CheckoutModal';
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
  const [checkoutMode, setCheckoutMode] = useState(null); // 'book' | 'buy' while the checkout modal is open
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // A live refresh may show that someone else took a seat this user had picked.
  useEffect(() => {
    const { selected, lost } = pruneSelection(selectedIds, seats);
    if (lost.length) {
      setSelectedIds(selected);
      setCheckoutMode(null);
      setMessage(`Seat ${lost.join(', ')} was just taken. Please choose another seat.`);
    }
  }, [seats]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = (seat) => {
    const result = toggleSeat(selectedIds, seat, passengers);
    setSelectedIds(result.selected);
    setMessage(result.error);
  };

  const openCheckout = (mode) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setMessage('');
    setCheckoutError('');
    setCheckoutMode(mode);
  };

  const handleConfirm = async ({ travelerId, paymentMethodId }) => {
    setSubmitting(true);
    setCheckoutError('');
    try {
      const result = await createBooking(Number(flightId), {
        seatIds: selectedIds,
        mode: checkoutMode,
        travelerId,
        paymentMethodId,
      });
      navigate('/my-bookings', { state: { notice: result.message } });
    } catch (err) {
      // A taken seat shows up in the refresh below, and the effect above closes checkout.
      setCheckoutError(err.message || 'Booking failed.');
      refresh();
    } finally {
      setSubmitting(false);
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
                    disabled={selectedIds.length !== passengers || Boolean(checkoutMode)}
                    onClick={() => openCheckout('book')}
                    title="Reserve the seats now and pay later from My Bookings"
                  >
                    Book (pay later)
                  </button>
                  <button
                    type="button"
                    className="search-btn"
                    disabled={selectedIds.length !== passengers || Boolean(checkoutMode)}
                    onClick={() => openCheckout('buy')}
                    title="Pay now and get your ticket immediately"
                  >
                    Buy now
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

      {checkoutMode && (
        <CheckoutModal
          flight={flight}
          seats={selectedSeats}
          mode={checkoutMode}
          submitting={submitting}
          error={checkoutError}
          onClose={() => setCheckoutMode(null)}
          onConfirm={handleConfirm}
        />
      )}

      <SiteFooter />
    </div>
  );
}

export default SeatSelectionPage;
