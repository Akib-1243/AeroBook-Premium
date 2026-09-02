import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { searchFlights } from '../api/flights';

function HomePage() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [flights, setFlights] = useState([]);

  const { isAuthenticated, isAdmin, logout } = useAuth();

  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSearch = async () => {
    try {
      const result = await searchFlights({
        origin,
        destination,
        date,
        time,
        passengers,
      });

      setFlights(result.data);
      console.log(result.data);
    } catch (error) {
      console.error('Flight search failed:', error);
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

          <a href="#about">About</a>

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

              <input
                type="text"
                placeholder="Departure city"
                value={origin}
                onChange={(e) =>
                  setOrigin(e.target.value)
                }
              />
            </div>


            {/* Swap */}
            <div className="swap-icon">
              ⇄
            </div>


            {/* To */}
            <div className="search-field">
              <label>To</label>

              <input
                type="text"
                placeholder="Destination city"
                value={destination}
                onChange={(e) =>
                  setDestination(e.target.value)
                }
              />
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


            {/* Departure Time */}
            <div className="search-field">
              <label>Departure Time</label>

              <input
                type="time"
                value={time}
                onChange={(e) =>
                  setTime(e.target.value)
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
            >
              Search Flights
            </button>

          </div>
        </div>
      </section>


      {/* Search Results */}
      {flights.length > 0 && (
        <section className="flight-results">
          <h2>Available Flights</h2>

          {flights.map((flight) => (
            <div
              className="flight-result-card"
              key={flight.flight_id}
            >
              <h3>
                {flight.origin} → {flight.destination}
              </h3>

              <p>
                Flight ID: {flight.flight_id}
              </p>

              <p>
                Departure: {flight.departure}
              </p>

              <p>
                Arrival: {flight.arrival}
              </p>

              <p>
                Aircraft: {flight.aircraft_model}
              </p>

              <p>
                Available Seats: {flight.available_seats}
              </p>
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


      <section className="about-section" id="about">
        <div className="about-intro">
          <p className="about-eyebrow">ABOUT AEROBOOK</p>
          <h2>Travel planning that feels clear from takeoff to landing.</h2>
          <p>
            AeroBook is a flight booking platform that helps travelers search
            available routes, choose seats, and manage reservations in one
            simple place.
          </p>
          <button className="about-cta" onClick={() => navigate('/register')}>
            Start Booking
          </button>
        </div>

        <div className="about-details">
          <div className="mission-block">
            <p className="about-eyebrow">OUR MISSION</p>
            <h3>Make every journey easier to begin.</h3>
            <p>
              We are building a more transparent booking experience, with
              reliable availability and the details travelers need before they
              commit to a trip.
            </p>
          </div>

          <div className="team-block">
            <p className="about-eyebrow">THE TEAM</p>
            <div className="team-list">
              <div>
                <strong>Product</strong>
                <span>Designing calmer journeys</span>
              </div>
              <div>
                <strong>Engineering</strong>
                <span>Building dependable bookings</span>
              </div>
              <div>
                <strong>Support</strong>
                <span>Here when plans change</span>
              </div>
            </div>
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

