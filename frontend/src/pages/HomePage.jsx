import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
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
          <a href="#">My Bookings</a>
          <a href="#">About</a>
        </div>

        <div className="nav-buttons">
          {isAuthenticated ? (
            <button className="signup-btn" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <>
              <button className="login-btn" onClick={() => navigate('/login')}>
                Login
              </button>
              <button className="signup-btn" onClick={() => navigate('/register')}>
                Sign Up
              </button>
            </>
          )}
        </div>
      </nav>


      {/* Hero Section */}
      <section className="hero-section">

        <div className="hero-content">
          <p className="hero-label">YOUR JOURNEY STARTS HERE</p>

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
                <input type="radio" name="trip" defaultChecked />
                Round Trip
              </label>

              <label>
                <input type="radio" name="trip" />
                One Way
              </label>
            </div>
          </div>


          <div className="search-fields">

            <div className="search-field">
              <label>From</label>
              <input
                type="text"
                placeholder="Departure city"
              />
            </div>

            <div className="swap-icon">
              ⇄
            </div>

            <div className="search-field">
              <label>To</label>
              <input
                type="text"
                placeholder="Destination city"
              />
            </div>

            <div className="search-field">
              <label>Departure</label>
              <input
                type="date"
              />
            </div>

            <div className="search-field">
              <label>Passengers</label>
              <select defaultValue="1">
                <option value="1">1 Passenger</option>
                <option value="2">2 Passengers</option>
                <option value="3">3 Passengers</option>
                <option value="4">4 Passengers</option>
                <option value="5">5 Passengers</option>
              </select>
            </div>

            <button className="search-btn">
              Search Flights
            </button>

          </div>
        </div>

      </section>


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
            <div className="feature-icon">✈</div>

            <h3>Easy Flight Booking</h3>

            <p>
              Search available flights and reserve
              your preferred seat with ease.
            </p>
          </div>


          <div className="feature-card">
            <div className="feature-icon">◉</div>

            <h3>Real-Time Availability</h3>

            <p>
              Check current flight and seat
              availability before making a reservation.
            </p>
          </div>


          <div className="feature-card">
            <div className="feature-icon">✓</div>

            <h3>Secure Reservations</h3>

            <p>
              AeroBook is designed to prevent
              duplicate seat reservations.
            </p>
          </div>


          <div className="feature-card">
            <div className="feature-icon">▣</div>

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
  )
}

export default HomePage