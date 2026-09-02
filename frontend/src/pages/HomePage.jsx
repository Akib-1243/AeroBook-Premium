import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAirports, searchFlights } from '../api/flights';
import { createBooking } from '../api/bookings';

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

  const { isAuthenticated, isAdmin, logout } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    getAirports()
      .then((result) => setAirports(result.data || []))
      .catch((error) => console.error('Airport list failed:', error));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleBook = async (flightId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setBookingFlightId(flightId);
    setSearchError('');

    try {
      await createBooking(flightId);
      navigate('/my-bookings');
    } catch (error) {
      setSearchError(error.message || 'Booking failed.');
    } finally {
      setBookingFlightId(null);
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

          <a href="#">About</a>

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
            <button
              className="signup-btn"
              onClick={handleLogout}
            >
              Logout
            </button>
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
              </div>

              <button
                className="search-btn"
                onClick={() => handleBook(flight.flight_id)}
                disabled={bookingFlightId === flight.flight_id}
              >
                {bookingFlightId === flight.flight_id ? 'Booking...' : 'Book Flight'}
              </button>
            </div>
          ))}
        </section>
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


      {/* Footer */}
      <footer className="footer">

        <div>
          <h3>✈ AeroBook</h3>

          <p>
            Your smarter way to travel.
          </p>
        </div>

        <p>
          © 2026 AeroBook. All rights reserved.
        </p>

      </footer>

    </div>
  );
}

export default HomePage;

