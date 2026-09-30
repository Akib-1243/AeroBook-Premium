import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAirline } from '../api/airlineFlights';
import '../styles/FlightManagement.css';

function AirlineLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('airline_token')) {
      navigate('/airline/flights', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await loginAirline({ email, password });
      localStorage.setItem('airline_token', result.access_token);
      localStorage.setItem('airline_user', JSON.stringify(result.user));
      navigate('/airline/flights', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Airline sign in failed. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="airline-login-shell">
      <section className="airline-login-panel">
        <p className="flight-management-eyebrow">PARTNER OPERATIONS</p>
        <h1>Airline portal</h1>
        <p className="airline-login-copy">Sign in to manage your company’s flight schedule and fares.</p>
        {error && <p className="flight-management-alert" role="alert">{error}</p>}
        <form className="airline-login-form" onSubmit={handleSubmit}>
          <label>
            <span>Company account email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          </label>
          <button type="submit" className="flight-save-button" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in to airline portal'}
          </button>
        </form>
        <button type="button" className="airline-login-back" onClick={() => navigate('/admin-login')}>
          AeroBook administrator sign in
        </button>
      </section>
    </main>
  );
}

export default AirlineLoginPage;
