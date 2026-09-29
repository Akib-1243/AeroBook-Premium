import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { getAirports, searchFlights } from '../api/flights';
import { createBooking } from '../api/bookings';
import { getProfileDetails } from '../api/profile';
import { getSavedPaymentMethods, tokenizeSandboxPaymentMethod } from '../api/bookingAccount';
import SiteFooter from '../components/SiteFooter';
import UserProfileMenu from '../components/UserProfileMenu';

const normalizeDefaultFlag = (value) => value === true || value === 1 || value === '1';
const normalizePaymentMethods = (methods = []) => methods.map((method) => ({
  ...method,
  is_default: normalizeDefaultFlag(method?.is_default),
}));

function HomePage() {
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  const defaultDateValue = [
    defaultDate.getFullYear(),
    String(defaultDate.getMonth() + 1).padStart(2, '0'),
    String(defaultDate.getDate()).padStart(2, '0'),
  ].join('-');

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(defaultDateValue);
  const [passengers, setPassengers] = useState(1);
  const [flights, setFlights] = useState([]);
  const [airports, setAirports] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [bookingFlightId, setBookingFlightId] = useState(null);
  const [bookingCandidate, setBookingCandidate] = useState(null);
  const [savedTravelers, setSavedTravelers] = useState([]);
  const [selectedTravelerId, setSelectedTravelerId] = useState('');
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [sandboxCard, setSandboxCard] = useState({
    payment_method_type: 'card',
    cardholder_name: '',
    card_number: '',
    expiry_month: '12',
    expiry_year: String(new Date().getFullYear() + 2),
    security_code: '',
    wallet_name: 'bKash',
    wallet_reference: '',
    bank_name: 'City Bank',
  });
  const [tokenizingCard, setTokenizingCard] = useState(false);

  const { isAuthenticated, isAdmin, user } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    getAirports()
      .then((result) => setAirports(result.data || []))
      .catch((error) => console.error('Airport list failed:', error));
  }, []);

  const handleBook = async (flightId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setBookingFlightId(flightId);
    setSearchError('');

    try {
      const [result, paymentResult] = await Promise.all([getProfileDetails(), getSavedPaymentMethods()]);
      setSavedTravelers(result.travelers || []);
      setSelectedTravelerId('');
      const methods = normalizePaymentMethods(paymentResult.data || []);
      setSavedPaymentMethods(methods);
      setSelectedPaymentMethodId(String(methods.find((method) => method.is_default)?.id || methods[0]?.id || ''));
      setBookingCandidate(flights.find((flight) => flight.flight_id === flightId) || { flight_id: flightId });
    } catch (error) {
      setSearchError(error.message || 'Traveler details could not be loaded.');
    } finally {
      setBookingFlightId(null);
    }
  };

  const confirmBooking = async (event) => {
    event.preventDefault();
    if (!bookingCandidate) return;
    if (!selectedPaymentMethodId) {
      setSearchError('Add or select a sandbox payment method to continue.');
      return;
    }

    setBookingFlightId(bookingCandidate.flight_id);
    setSearchError('');
    try {
      await createBooking(bookingCandidate.flight_id, selectedTravelerId || null, selectedPaymentMethodId);
      navigate('/my-bookings');
    } catch (error) {
      setSearchError(error.message || 'Booking failed.');
    } finally {
      setBookingFlightId(null);
    }
  };

  const tokenizeSandboxCard = async () => {
    setTokenizingCard(true);
    setSearchError('');
    try {
      const result = await tokenizeSandboxPaymentMethod({
        ...sandboxCard,
        payment_method_type: sandboxCard.payment_method_type || 'card',
        expiry_month: sandboxCard.payment_method_type === 'card' ? Number(sandboxCard.expiry_month) : null,
        expiry_year: sandboxCard.payment_method_type === 'card' ? Number(sandboxCard.expiry_year) : null,
        security_code: sandboxCard.payment_method_type === 'card' ? sandboxCard.security_code : null,
        make_default: savedPaymentMethods.length === 0,
      });
      const method = normalizePaymentMethods([result.payment_method])[0];
      setSavedPaymentMethods((current) => normalizePaymentMethods([method, ...current]));
      setSelectedPaymentMethodId(String(method.id));
      setSandboxCard({
        payment_method_type: 'card',
        cardholder_name: '',
        card_number: '',
        expiry_month: '12',
        expiry_year: String(new Date().getFullYear() + 2),
        security_code: '',
        wallet_name: 'bKash',
        wallet_reference: '',
        bank_name: 'City Bank',
      });
    } catch (error) {
      setSearchError(error.message || 'The sandbox card could not be tokenized.');
    } finally {
      setTokenizingCard(false);
    }
  };

  const handleSearch = async () => {
    if (!origin || !destination) {
      setSearchError('Choose a departure and destination city first.');
      setHasSearched(true);
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setHasSearched(true);

    try {
      const result = await searchFlights({
        origin,
        destination,
        date,
        passengers,
      });

      setFlights(result.data);
    } catch (error) {
      setFlights([]);
      setSearchError(error.message || 'Flight search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="home-page">

      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="logo">
          ✈ AeroBook
        </div>

        <div className="nav-links">
          <a href="/">Home</a>
          <a href="#">Flights</a>

          <a
            href="#"
            onClick={() =>
              isAuthenticated && navigate('/my-bookings')
            }
          >
            My Bookings
          </a>

          <Link to="/about-us">About</Link>

          {isAdmin && (
            <button
              className="login-btn"
              style={{ padding: '10px 20px', fontSize: '15px' }}
              onClick={() => navigate('/admin')}
            >
              Admin Panel
            </button>
          )}
        </div>

        <div className="nav-buttons">
          {isAuthenticated ? (
            <UserProfileMenu />
          ) : (
            <>
              <button
                className="login-btn"
                onClick={() => navigate('/login')}
              >
                Login
              </button>

              <button
                className="signup-btn"
                onClick={() => navigate('/register')}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </nav>


      {/* Hero Section */}
      <section className="hero-section">

        <div className="hero-content">
          <p className="hero-label">
            YOUR JOURNEY STARTS HERE
          </p>

          <h1>
            Fly Beyond
            <br />
            <span>Expectations.</span>
          </h1>

          <p className="hero-description">
            Book your next flight with AeroBook.
            Enjoy a fast, secure and seamless flight
            reservation experience.
          </p>
        </div>


        {/* Flight Search Card */}
        <div className="flight-search-card">

          <div className="search-header">
            <h2>Search Flights</h2>

            <div className="trip-type">
              <label>
                <input
                  type="radio"
                  name="trip"
                  defaultChecked
                />
                Round Trip
              </label>

              <label>
                <input
                  type="radio"
                  name="trip"
                />
                One Way
              </label>
            </div>
          </div>


          <div className="search-fields">

            {/* From */}
            <div className="search-field">
              <label>From</label>

              <select
                value={origin}
                onChange={(e) =>
                  setOrigin(e.target.value)
                }
              >
                <option value="">Departure city</option>
                {airports.map((airport) => (
                  <option key={airport.id} value={airport.city}>
                    {airport.city}
                  </option>
                ))}
              </select>
            </div>


            {/* Swap */}
            <div className="swap-icon">
              ⇄
            </div>


            {/* To */}
            <div className="search-field">
              <label>To</label>

              <select
                value={destination}
                onChange={(e) =>
                  setDestination(e.target.value)
                }
              >
                <option value="">Destination city</option>
                {airports.map((airport) => (
                  <option key={airport.id} value={airport.city}>
                    {airport.city}
                  </option>
                ))}
              </select>
            </div>


            {/* Departure Date */}
            <div className="search-field">
              <label>Departure</label>

              <input
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(e.target.value)
                }
              />
            </div>


            {/* Passengers */}
            <div className="search-field">
              <label>Passengers</label>

              <select
                value={passengers}
                onChange={(e) =>
                  setPassengers(Number(e.target.value))
                }
              >
                <option value="1">
                  1 Passenger
                </option>

                <option value="2">
                  2 Passengers
                </option>

                <option value="3">
                  3 Passengers
                </option>

                <option value="4">
                  4 Passengers
                </option>

                <option value="5">
                  5 Passengers
                </option>
              </select>
            </div>


            {/* Search Button */}
            <button
              className="search-btn"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search Flights'}
            </button>

          </div>
        </div>
      </section>


      {/* Search Results */}
      {hasSearched && (
        <section className="flight-results">
          <h2>{flights.length > 0 ? 'Available Flights' : 'No Flights Found'}</h2>

          {searchError && <p>{searchError}</p>}

          {!searchError && flights.length === 0 && (
            <p>No scheduled flights match this route and time.</p>
          )}

          {flights.map((flight) => (
            <div
              className="flight-result-card"
              key={flight.flight_id}
            >
              <div className="flight-card-header">
                <div>
                  <span className="flight-card-label">AeroBook flight</span>
                  <h3>{flight.origin} <span>to</span> {flight.destination}</h3>
                </div>
                <span className="flight-status">{flight.flight_status}</span>
              </div>

              <div className="flight-card-details">
                <div>
                  <span className="flight-card-label">Departure</span>
                  <strong>{new Date(flight.departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  <small>{new Date(flight.departure).toLocaleDateString([], { month: 'short', day: 'numeric' })}</small>
                </div>
                <div className="flight-card-line">&#8594;</div>
                <div>
                  <span className="flight-card-label">Arrival</span>
                  <strong>{new Date(flight.arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  <small>{flight.aircraft_model}</small>
                </div>
                <div className="flight-card-seats">
                  <span className="flight-card-label">Availability</span>
                  <strong>{flight.available_seats} seats</strong>
                  <small>of {flight.total_seats} total</small>
                </div>
                <div className="flight-card-fare">
                  <span className="flight-card-label">Sandbox fare</span>
                  <strong>{new Intl.NumberFormat(undefined, { style: 'currency', currency: flight.currency || 'USD' }).format(Number(flight.base_fare || 0))}</strong>
                  <small>per traveler</small>
                </div>
              </div>

              <button
                className="search-btn"
                onClick={() => handleBook(flight.flight_id)}
                disabled={bookingFlightId === flight.flight_id}
              >
                {bookingFlightId === flight.flight_id ? 'Loading travelers...' : 'Book Flight'}
              </button>
            </div>
          ))}
        </section>
      )}

      {bookingCandidate && (
        <div className="booking-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !bookingFlightId) setBookingCandidate(null);
        }}>
          <section className="booking-traveler-modal" role="dialog" aria-modal="true" aria-labelledby="booking-traveler-title">
            <button type="button" className="booking-modal-close" aria-label="Close traveler selection" onClick={() => setBookingCandidate(null)}>×</button>
            <p className="profile-eyebrow">PASSENGER DETAILS</p>
            <h2 id="booking-traveler-title">Who is traveling?</h2>
            <p>Select the traveler and sandbox payment method for this reservation. Charges are simulated only.</p>
            <form onSubmit={confirmBooking}>
              <div className="booking-traveler-options">
                <label className={selectedTravelerId === '' ? 'selected' : ''}>
                  <input type="radio" name="booking-traveler" value="" checked={selectedTravelerId === ''} onChange={() => setSelectedTravelerId('')} />
                  <span><strong>{user?.name || 'Me'}</strong><small>My profile details</small></span>
                </label>
                {savedTravelers.map((traveler) => (
                  <label className={String(selectedTravelerId) === String(traveler.id) ? 'selected' : ''} key={traveler.id}>
                    <input type="radio" name="booking-traveler" value={traveler.id} checked={String(selectedTravelerId) === String(traveler.id)} onChange={() => setSelectedTravelerId(String(traveler.id))} />
                    <span><strong>{traveler.title ? `${traveler.title} ` : ''}{traveler.first_name} {traveler.last_name}</strong><small>{traveler.nationality || 'Saved traveler'}{traveler.passport_number ? ` · Passport ending ${traveler.passport_number.slice(-4)}` : ''}</small></span>
                  </label>
                ))}
              </div>
              <div className="booking-checkout-payment">
                <div><span className="profile-eyebrow">PAYMENT</span><strong>Sandbox total: {new Intl.NumberFormat(undefined, { style: 'currency', currency: bookingCandidate.currency || 'USD' }).format(Number(bookingCandidate.base_fare || 0))}</strong></div>
                {savedPaymentMethods.length ? <div className="booking-traveler-options">{savedPaymentMethods.map((method) => <label className={String(selectedPaymentMethodId) === String(method.id) ? 'selected' : ''} key={method.id}>
                  <input type="radio" name="booking-payment-method" value={method.id} checked={String(selectedPaymentMethodId) === String(method.id)} onChange={() => setSelectedPaymentMethodId(String(method.id))} />
                  <span><strong>{method.brand} ending in {method.last_four}{method.is_default ? ' · Default' : ''}</strong><small>Expires {String(method.expiry_month).padStart(2, '0')}/{method.expiry_year} · tokenized by {method.gateway}</small></span>
                </label>)}</div> : <p className="booking-modal-error">No saved payment method yet. Add a sandbox test card below.</p>}
                <details className="booking-add-card-details" open={savedPaymentMethods.length === 0}>
                  <summary>Add sandbox test card</summary>
                  <p>Approved card: 4242 4242 4242 4242. Decline test: 4000 0000 0000 0002. Use any future expiry and a 3-digit security code. Never use a real card.</p>
                  <div className="booking-add-card-fields">
                    <label>Payment method<select value={sandboxCard.payment_method_type || 'card'} onChange={(event) => setSandboxCard((current) => ({ ...current, payment_method_type: event.target.value }))}>
                      <option value="card">Card</option>
                      <option value="wallet">Mobile wallet</option>
                      <option value="bank_transfer">Bank transfer</option>
                      <option value="cod">Cash on delivery</option>
                    </select></label>
                    {sandboxCard.payment_method_type === 'card' && <>
                      <label>Cardholder<input autoComplete="off" data-lpignore="true" data-1p-ignore="true" value={sandboxCard.cardholder_name} onChange={(event) => setSandboxCard((current) => ({ ...current, cardholder_name: event.target.value }))} /></label>
                      <label>Test card number<input inputMode="numeric" autoComplete="off" data-lpignore="true" data-1p-ignore="true" value={sandboxCard.card_number} onChange={(event) => setSandboxCard((current) => ({ ...current, card_number: event.target.value.replace(/[^\d ]/g, '').slice(0, 23) }))} /></label>
                      <label>Expiry month<select autoComplete="off" data-lpignore="true" data-1p-ignore="true" value={sandboxCard.expiry_month} onChange={(event) => setSandboxCard((current) => ({ ...current, expiry_month: event.target.value }))}>{Array.from({ length: 12 }, (_, index) => String(index + 1)).map((month) => <option key={month} value={month}>{month.padStart(2, '0')}</option>)}</select></label>
                      <label>Expiry year<input autoComplete="off" data-lpignore="true" data-1p-ignore="true" inputMode="numeric" value={sandboxCard.expiry_year} onChange={(event) => setSandboxCard((current) => ({ ...current, expiry_year: event.target.value.replace(/\D/g, '').slice(0, 4) }))} /></label>
                      <label>Security code<input type="text" inputMode="numeric" autoComplete="off" data-lpignore="true" data-1p-ignore="true" value={sandboxCard.security_code} onChange={(event) => setSandboxCard((current) => ({ ...current, security_code: event.target.value.replace(/\D/g, '').slice(0, 8) }))} /></label>
                    </>}
                    {sandboxCard.payment_method_type === 'wallet' && <>
                      <label>Wallet name<select value={sandboxCard.wallet_name || 'bKash'} onChange={(event) => setSandboxCard((current) => ({ ...current, wallet_name: event.target.value }))}><option value="bKash">bKash</option><option value="Nagad">Nagad</option><option value="Rocket">Rocket</option></select></label>
                      <label>Wallet number<input type="text" inputMode="numeric" autoComplete="off" data-lpignore="true" data-1p-ignore="true" value={sandboxCard.wallet_reference || ''} onChange={(event) => setSandboxCard((current) => ({ ...current, wallet_reference: event.target.value.replace(/\D/g, '').slice(0, 16) }))} /></label>
                    </>}
                    {sandboxCard.payment_method_type === 'bank_transfer' && <>
                      <label>Bank<select value={sandboxCard.bank_name || 'City Bank'} onChange={(event) => setSandboxCard((current) => ({ ...current, bank_name: event.target.value }))}><option value="City Bank">City Bank</option><option value="Dutch Bangla Bank">Dutch Bangla Bank</option><option value="BRAC Bank">BRAC Bank</option></select></label>
                      <label>Account reference<input type="text" autoComplete="off" data-lpignore="true" data-1p-ignore="true" value={sandboxCard.wallet_reference || ''} onChange={(event) => setSandboxCard((current) => ({ ...current, wallet_reference: event.target.value.slice(0, 24) }))} /></label>
                    </>}
                    {sandboxCard.payment_method_type === 'cod' && <>
                      <label>Collection note<input type="text" autoComplete="off" data-lpignore="true" data-1p-ignore="true" value={sandboxCard.wallet_reference || ''} onChange={(event) => setSandboxCard((current) => ({ ...current, wallet_reference: event.target.value.slice(0, 80) }))} placeholder="Office pickup / payment deadline" /></label>
                    </>}
                  </div>
                  <button type="button" className="profile-secondary-button" disabled={tokenizingCard || !sandboxCard.cardholder_name || !sandboxCard.card_number || !sandboxCard.security_code} onClick={tokenizeSandboxCard}>{tokenizingCard ? 'Tokenizing...' : 'Tokenize test card'}</button>
                </details>
              </div>
              {searchError && <p className="booking-modal-error" role="alert">{searchError}</p>}
              <div className="booking-modal-actions">
                <button type="button" className="booking-modal-cancel" onClick={() => setBookingCandidate(null)} disabled={Boolean(bookingFlightId)}>Cancel</button>
                <button type="submit" className="search-btn" disabled={Boolean(bookingFlightId)}>{bookingFlightId ? 'Booking...' : 'Continue booking'}</button>
              </div>
            </form>
          </section>
        </div>
      )}


      {/* Features Section */}
      <section className="features-section">

        <div className="section-heading">
          <p>WHY AEROBOOK?</p>

          <h2>
            Everything you need for
            <br />
            a better flight experience.
          </h2>
        </div>


        <div className="feature-grid">

          <div className="feature-card">
            <div className="feature-icon">
              ✈
            </div>

            <h3>Easy Flight Booking</h3>

            <p>
              Search available flights and reserve
              your preferred seat with ease.
            </p>
          </div>


          <div className="feature-card">
            <div className="feature-icon">
              ◉
            </div>

            <h3>Real-Time Availability</h3>

            <p>
              Check current flight and seat
              availability before making a reservation.
            </p>
          </div>


          <div className="feature-card">
            <div className="feature-icon">
              ✓
            </div>

            <h3>Secure Reservations</h3>

            <p>
              AeroBook is designed to prevent
              duplicate seat reservations.
            </p>
          </div>


          <div className="feature-card">
            <div className="feature-icon">
              ▣
            </div>

            <h3>Booking Management</h3>

            <p>
              Easily view and manage your flight
              bookings from one place.
            </p>
          </div>

        </div>
      </section>


      <SiteFooter />

    </div>
  );
}

export default HomePage;

