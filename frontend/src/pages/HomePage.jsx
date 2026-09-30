import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { getAirports, searchFlights } from '../api/flights';
import SiteFooter from '../components/SiteFooter';
import UserProfileMenu from '../components/UserProfileMenu';

const DEFAULT_FILTERS = {
  stops: 'all',
  airlines: [],
  minPrice: null,
  maxPrice: null,
  departurePeriods: [],
  arrivalPeriods: [],
  sort: 'departure_asc',
};

const TIME_PERIODS = [
  { value: 'early_morning', label: 'Early morning', hours: '00:00-04:59' },
  { value: 'morning', label: 'Morning', hours: '05:00-11:59' },
  { value: 'afternoon', label: 'Afternoon', hours: '12:00-17:59' },
  { value: 'evening', label: 'Evening', hours: '18:00-23:59' },
];

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
  const [flightPool, setFlightPool] = useState([]);
  const [airlineOptions, setAirlineOptions] = useState([]);
  const [searchCriteria, setSearchCriteria] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [airports, setAirports] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');

  const { isAuthenticated, isAdmin } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    getAirports()
      .then((result) => setAirports(result.data || []))
      .catch((error) => console.error('Airport list failed:', error));
  }, []);

  const handleBook = (flightId) => {
    navigate(`/flights/${flightId}/seats?passengers=${passengers}`);
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

      const results = result.data || [];
      setSearchCriteria({ origin, destination, date, passengers });
      setFlightPool(results);
      setFlights(results);
      setAirlineOptions(result.meta?.airlines || []);
      setFilters({ ...DEFAULT_FILTERS });
    } catch (error) {
      setFlights([]);
      setFlightPool([]);
      setAirlineOptions([]);
      setSearchError(error.message || 'Flight search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleApplyFilters = async (nextFilters = filters) => {
    if (!searchCriteria) return;

    setFilters(nextFilters);
    setIsFiltering(true);
    setSearchError('');

    try {
      const result = await searchFlights({ ...searchCriteria, filters: nextFilters });
      setFlights(result.data || []);
      setAirlineOptions(result.meta?.airlines || []);
    } catch (error) {
      setSearchError(error.message || 'Unable to apply flight filters.');
    } finally {
      setIsFiltering(false);
    }
  };

  const toggleFilterValue = (key, value) => {
    const currentValues = filters[key];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];
    setFilters({ ...filters, [key]: nextValues });
  };

  const handleResetFilters = () => {
    handleApplyFilters({ ...DEFAULT_FILTERS });
  };

  const fareValues = flightPool.map((flight) => Number(flight.base_fare)).filter(Number.isFinite);
  const minimumFare = fareValues.length ? Math.floor(Math.min(...fareValues)) : 0;
  const maximumFare = fareValues.length ? Math.ceil(Math.max(...fareValues)) : 1000;
  const selectedMinimumFare = Math.max(minimumFare, Number(filters.minPrice ?? minimumFare));
  const selectedMaximumFare = Math.max(selectedMinimumFare, Math.min(maximumFare, Number(filters.maxPrice ?? maximumFare)));
  const currency = flightPool[0]?.currency || 'USD';
  const formatFare = (value) => new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);

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
          <div className="flight-results-heading">
            <div>
              <p className="flight-results-eyebrow">SEARCH RESULTS</p>
              <h2>Available flights</h2>
              <p className="flight-results-count" aria-live="polite">
                {isFiltering ? 'Updating results...' : `${flights.length} flight${flights.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="flight-sort-control" role="group" aria-label="Sort fares">
              <span>Sort by fare</span>
              <button
                type="button"
                className={filters.sort === 'price_asc' ? 'is-active' : ''}
                onClick={() => handleApplyFilters({ ...filters, sort: 'price_asc' })}
                disabled={isFiltering || !flightPool.length}
              >
                Lowest first
              </button>
              <button
                type="button"
                className={filters.sort === 'price_desc' ? 'is-active' : ''}
                onClick={() => handleApplyFilters({ ...filters, sort: 'price_desc' })}
                disabled={isFiltering || !flightPool.length}
              >
                Highest first
              </button>
            </div>
          </div>

          {searchError && <p className="flight-search-error" role="alert">{searchError}</p>}

          {!searchError && (
            <div className="flight-results-layout">
              <aside className="flight-filter-panel" aria-label="Flight filters">
                  <div className="flight-filter-heading">
                    <h3>Filters</h3>
                    <button type="button" onClick={handleResetFilters} disabled={isFiltering}>
                      Reset
                    </button>
                  </div>

                  <fieldset className="flight-filter-group" disabled={isFiltering}>
                    <legend>Stops</legend>
                    <label className="flight-filter-option">
                      <input type="radio" name="flight-stops" checked={filters.stops === 'all'} onChange={() => setFilters({ ...filters, stops: 'all' })} />
                      <span>Any</span>
                    </label>
                    <label className="flight-filter-option">
                      <input type="radio" name="flight-stops" checked={filters.stops === '0'} onChange={() => setFilters({ ...filters, stops: '0' })} />
                      <span>Non-stop</span>
                    </label>
                    <p className="flight-filter-note">Connecting itineraries are not available yet.</p>
                    <label className="flight-filter-option is-unavailable">
                      <input type="radio" name="flight-stops" disabled />
                      <span>1 stop</span>
                    </label>
                    <label className="flight-filter-option is-unavailable">
                      <input type="radio" name="flight-stops" disabled />
                      <span>2+ stops</span>
                    </label>
                  </fieldset>

                  <fieldset className="flight-filter-group" disabled={isFiltering}>
                    <legend>Airlines</legend>
                    {airlineOptions.map((airline) => (
                      <label className="flight-filter-option flight-airline-option" key={airline.name}>
                        <input
                          type="checkbox"
                          checked={filters.airlines.includes(airline.name)}
                          onChange={() => toggleFilterValue('airlines', airline.name)}
                        />
                        <span className="flight-airline-name">{airline.name}</span>
                        <span className="flight-airline-count">{airline.count}</span>
                      </label>
                    ))}
                    {!airlineOptions.length && <p className="flight-filter-note">No airlines in the database.</p>}
                  </fieldset>

                  <fieldset className="flight-filter-group fare-filter-group" disabled={isFiltering || !fareValues.length}>
                    <legend>Price range</legend>
                    <div className="fare-range-values">
                      <span>{formatFare(selectedMinimumFare)}</span>
                      <span>{formatFare(selectedMaximumFare)}</span>
                    </div>
                    <label className="fare-range-control">
                      <span>Minimum fare</span>
                      <input
                        type="range"
                        min={minimumFare}
                        max={maximumFare}
                        step="1"
                        value={selectedMinimumFare}
                        aria-label="Minimum fare"
                        onChange={(event) => setFilters({
                          ...filters,
                          minPrice: Math.min(Number(event.target.value), selectedMaximumFare),
                        })}
                      />
                    </label>
                    <label className="fare-range-control">
                      <span>Maximum fare</span>
                      <input
                        type="range"
                        min={minimumFare}
                        max={maximumFare}
                        step="1"
                        value={selectedMaximumFare}
                        aria-label="Maximum fare"
                        onChange={(event) => setFilters({
                          ...filters,
                          maxPrice: Math.max(Number(event.target.value), selectedMinimumFare),
                        })}
                      />
                    </label>
                  </fieldset>

                  {[['departurePeriods', 'Departure time'], ['arrivalPeriods', 'Arrival time']].map(([key, title]) => (
                    <fieldset className="flight-filter-group" key={key} disabled={isFiltering}>
                      <legend>{title}</legend>
                      {TIME_PERIODS.map((period) => (
                        <label className="flight-time-option" key={period.value}>
                          <input
                            type="checkbox"
                            checked={filters[key].includes(period.value)}
                            onChange={() => toggleFilterValue(key, period.value)}
                          />
                          <span className="flight-time-copy">
                            <strong>{period.label}</strong>
                            <small>{period.hours}</small>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  ))}

                  <button className="flight-filter-apply" type="button" onClick={() => handleApplyFilters()} disabled={isFiltering}>
                    {isFiltering ? 'Applying...' : 'Apply filters'}
                  </button>
              </aside>

              <div className="flight-results-list" aria-busy={isFiltering}>
                {flights.length === 0 ? (
                  <div className="flight-empty-state">
                    <h3>{flightPool.length ? 'No flights match these filters' : 'No flights found'}</h3>
                    <p>{flightPool.length ? 'Adjust your filters and try again.' : 'No scheduled flights match this route and date.'}</p>
                  </div>
                ) : flights.map((flight) => (
                  <article className="flight-result-card" key={flight.flight_id}>
                    <div className="flight-card-header">
                      <div>
                        <span className="flight-card-label">{flight.airline || 'AeroBook Air'}</span>
                        <h3>{flight.origin} <span>to</span> {flight.destination}</h3>
                      </div>
                      <span className="flight-status">Non-stop</span>
                    </div>

                    <div className="flight-card-details">
                      <div>
                        <span className="flight-card-label">Departure</span>
                        <strong>{new Date(flight.departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                        <small>{new Date(flight.departure).toLocaleDateString([], { month: 'short', day: 'numeric' })}</small>
                      </div>
                      <div className="flight-card-line" aria-hidden="true">&#8594;</div>
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
                        <span className="flight-card-label">Fare per traveler</span>
                        <strong>{new Intl.NumberFormat(undefined, { style: 'currency', currency: flight.currency || 'USD' }).format(Number(flight.base_fare || 0))}</strong>
                      </div>
                    </div>

                    <button className="search-btn" onClick={() => handleBook(flight.flight_id)}>
                      Choose Seats
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}
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


      <SiteFooter />

    </div>
  );
}

export default HomePage;

