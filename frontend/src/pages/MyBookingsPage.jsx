import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cancelBooking, getRefundRequests, getSavedPaymentMethods, getTransactions, removeSavedPaymentMethod, setDefaultPaymentMethod, tokenizeSandboxPaymentMethod } from '../api/bookingAccount';
import { getMyBookings, payBooking } from '../api/bookings';
import UserProfileMenu from '../components/UserProfileMenu';

const sections = [
  { id: 'bookings', label: 'My bookings' },
  { id: 'transactions', label: 'Transaction history' },
  { id: 'payments', label: 'Saved payment methods' },
  { id: 'refunds', label: 'Refund status' },
];

const formatDate = (value, includeTime = true) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleString(undefined, includeTime
    ? { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' });
};

const normalizeDefaultFlag = (value) => value === true || value === 1 || value === '1';
const normalizePaymentMethods = (methods = []) => methods.map((method) => ({
  ...method,
  is_default: normalizeDefaultFlag(method?.is_default),
}));

const money = (amount, currency = 'USD') => amount == null
  ? 'Amount unavailable'
  : new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount));

function StatusBadge({ status }) {
  const normalized = String(status || 'pending').toLowerCase().replaceAll('_', ' ');
  const tone = ['confirmed', 'paid', 'completed', 'succeeded', 'processed'].includes(normalized)
    ? 'good'
    : ['cancelled', 'canceled', 'rejected', 'failed', 'expired'].includes(normalized)
      ? 'bad'
      : 'pending';
  return <span className={`account-status account-status-${tone}`}>{normalized}</span>;
}

function MyBookingsPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [bookingFilter, setBookingFilter] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [gateway, setGateway] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_method_type: 'card',
    cardholder_name: '',
    card_number: '',
    expiry_month: '12',
    expiry_year: String(new Date().getFullYear() + 2),
    security_code: '',
    wallet_name: 'bKash',
    wallet_reference: '',
    bank_name: 'City Bank',
    make_default: true,
  });
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(location.state?.notice || '');
  const [payMethodChoice, setPayMethodChoice] = useState({}); // booking id -> saved payment method id
  const [section, setSection] = useState('bookings');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [bookingResult, transactionResult, methodResult, refundResult] = await Promise.all([
        getMyBookings(), getTransactions(), getSavedPaymentMethods(), getRefundRequests(),
      ]);
      setBookings(bookingResult.data || []);
      setTransactions(transactionResult.data || []);
      setPaymentMethods(normalizePaymentMethods(methodResult.data || []));
      setGateway(methodResult.gateway || null);
      setRefunds(refundResult.data || []);
    } catch (loadError) {
      setError(loadError.message || 'We could not load your account activity. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const bookingCategory = (booking) => {
    const status = String(booking.status || '').toLowerCase();
    // An expired hold was never paid and its seat is back on sale, so it sits with the cancelled ones.
    if (['cancelled', 'canceled', 'expired'].includes(status)) return 'cancelled';
    const departure = new Date(booking.flight?.departure || 0);
    if (status === 'completed' || (departure.getTime() && departure < new Date())) return 'past';
    return 'upcoming';
  };

  const filteredBookings = bookings.filter((booking) => bookingCategory(booking) === bookingFilter);

  const handleCancel = async (booking) => {
    const confirmed = window.confirm(`Cancel booking #${booking.id}? If it has a successful payment, a refund request will be submitted for review.`);
    if (!confirmed) return;
    setSaving(`booking-${booking.id}`);
    setError('');
    setMessage('');
    try {
      const result = await cancelBooking(booking.id, 'Cancelled by traveler');
      setMessage(result.refund_note || result.message || 'Booking cancelled.');
      await refresh();
      setBookingFilter('cancelled');
    } catch (cancelError) {
      setError(cancelError.message || 'This booking could not be cancelled.');
    } finally {
      setSaving(null);
    }
  };

  const defaultPaymentMethodId = paymentMethods.find((method) => method.is_default)?.id || paymentMethods[0]?.id;

  // Pay for a booking that was reserved with "Book (pay later)".
  const handlePay = async (booking) => {
    const methodId = payMethodChoice[booking.id] || defaultPaymentMethodId;
    if (!methodId) {
      setError('Add a sandbox payment method first, then pay for your held seat.');
      setSection('payments');
      return;
    }
    setSaving(`pay-${booking.id}`);
    setError('');
    setMessage('');
    try {
      const result = await payBooking(booking.id, Number(methodId));
      setMessage(result.message || 'Payment received.');
    } catch (payError) {
      setError(payError.message || 'Payment could not be completed.');
    } finally {
      setSaving(null);
      await refresh();
    }
  };

  const handleRemovePaymentMethod = async (method) => {
    if (!window.confirm(`Remove the saved ${method.brand || 'payment'} method ending in ${method.last_four || '----'}?`)) return;
    setSaving(`method-${method.id}`);
    setError('');
    setMessage('');
    try {
      const result = await removeSavedPaymentMethod(method.id);
      setPaymentMethods((current) => current.filter((item) => item.id !== method.id));
      setMessage(result.message || 'Payment method removed.');
    } catch (removeError) {
      setError(removeError.message || 'Payment method could not be removed.');
    } finally {
      setSaving(null);
    }
  };

  const handleTokenizeCard = async (event) => {
    event.preventDefault();
    setSaving('tokenize');
    setError('');
    setMessage('');
    try {
      const payload = {
        ...paymentForm,
        payment_method_type: paymentForm.payment_method_type || 'card',
        expiry_month: paymentForm.payment_method_type === 'card' ? Number(paymentForm.expiry_month) : null,
        expiry_year: paymentForm.payment_method_type === 'card' ? Number(paymentForm.expiry_year) : null,
        security_code: paymentForm.payment_method_type === 'card' ? paymentForm.security_code : null,
      };

      const result = await tokenizeSandboxPaymentMethod(payload);
      const tokenizedMethod = normalizePaymentMethods([result.payment_method])[0];
      setPaymentMethods((current) => normalizePaymentMethods([tokenizedMethod, ...current.map((method) => ({ ...method, is_default: false }))]));
      setPaymentForm({
        payment_method_type: 'card',
        cardholder_name: '',
        card_number: '',
        expiry_month: '12',
        expiry_year: String(new Date().getFullYear() + 2),
        security_code: '',
        wallet_name: 'bKash',
        wallet_reference: '',
        bank_name: 'City Bank',
        make_default: true,
      });
      setMessage(result.message || 'Sandbox method tokenized.');
    } catch (tokenizeError) {
      setError(tokenizeError.message || 'Method could not be tokenized.');
    } finally {
      setSaving(null);
    }
  };

  const handleSetDefault = async (method) => {
    setSaving(`default-${method.id}`);
    setError('');
    setMessage('');
    try {
      const result = await setDefaultPaymentMethod(method.id);
      setPaymentMethods((current) => current.map((item) => ({ ...item, is_default: item.id === method.id })));
      setMessage(result.message || 'Default payment method updated.');
    } catch (defaultError) {
      setError(defaultError.message || 'Default payment method could not be changed.');
    } finally {
      setSaving(null);
    }
  };

  const renderBookings = () => (
    <>
      <div className="booking-filter-tabs" role="tablist" aria-label="Booking status">
        {[
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'past', label: 'Past' },
          { id: 'cancelled', label: 'Cancelled' },
        ].map((filter) => <button key={filter.id} type="button" role="tab" aria-selected={bookingFilter === filter.id} className={bookingFilter === filter.id ? 'active' : ''} onClick={() => setBookingFilter(filter.id)}>
          {filter.label}<span>{bookings.filter((booking) => bookingCategory(booking) === filter.id).length}</span>
        </button>)}
      </div>
      {filteredBookings.length ? <div className="booking-account-list">
        {filteredBookings.map((booking) => {
          const isCancelable = bookingCategory(booking) === 'upcoming' && ['confirmed', 'pending'].includes(String(booking.status || '').toLowerCase());
          return <article className="booking-account-card" key={booking.id}>
            <div className="booking-account-card-top">
              <div><span className="booking-account-kicker">AEROBOOK RESERVATION</span><h3>{booking.flight?.origin || 'Origin'} <span aria-hidden="true">→</span> {booking.flight?.destination || 'Destination'}</h3></div>
              <div className="booking-card-badges"><StatusBadge status={booking.status} />{booking.payment?.status && <StatusBadge status={booking.payment.status} />}</div>
            </div>
            <div className="booking-account-details">
              <div><span>Departure</span><strong>{formatDate(booking.flight?.departure)}</strong></div>
              <div><span>Booking reference</span><strong>#{booking.id}</strong></div>
              <div><span>Traveler</span><strong>{booking.traveler ? `${booking.traveler.first_name} ${booking.traveler.last_name}` : 'Primary traveler'}</strong></div>
              <div><span>Seat</span><strong>{booking.seat?.number || 'Pending'}{booking.seat?.class ? ` · ${booking.seat.class}` : ''}</strong></div>
              <div><span>Amount</span><strong>{booking.status === 'pending' && booking.payment?.amount == null ? 'Due at payment' : money(booking.payment?.amount)}</strong></div>
            </div>
            {booking.status === 'pending' && <div className="booking-card-footer">
              <span>Seat held until {formatDate(booking.hold_expires_at)}. Pay before then to get your ticket.</span>
              <span>
                {paymentMethods.length > 1 && <select aria-label={`Payment method for booking #${booking.id}`} value={payMethodChoice[booking.id] || defaultPaymentMethodId} onChange={(event) => setPayMethodChoice((current) => ({ ...current, [booking.id]: event.target.value }))}>
                  {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.brand} ···· {method.last_four}</option>)}
                </select>}{' '}
                <button type="button" className="search-btn" disabled={saving === `pay-${booking.id}`} onClick={() => handlePay(booking)}>{saving === `pay-${booking.id}` ? 'Processing…' : 'Pay now'}</button>
              </span>
            </div>}
            <div className="booking-card-footer"><span>Booked {formatDate(booking.timestamp)}</span>{isCancelable && <button type="button" className="account-danger-link" disabled={saving === `booking-${booking.id}`} onClick={() => handleCancel(booking)}>{saving === `booking-${booking.id}` ? 'Cancelling...' : 'Cancel booking'}</button>}</div>
          </article>;
        })}
      </div> : <div className="booking-account-empty"><span aria-hidden="true">{bookingFilter === 'upcoming' ? '✈' : '○'}</span><h3>{bookingFilter === 'upcoming' ? 'Your next trip starts here' : `No ${bookingFilter} bookings`}</h3><p>{bookingFilter === 'upcoming' ? 'When you book a flight, it will appear here with all the details you need.' : 'There are no reservations in this section yet.'}</p>{bookingFilter === 'upcoming' && <button type="button" onClick={() => navigate('/home')}>Find a flight</button>}</div>}
    </>
  );

  const renderTransactions = () => transactions.length ? <div className="account-table-wrap"><table className="account-table"><thead><tr><th>Receipt</th><th>Booking</th><th>Route</th><th>Date</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.id}><td><strong>{transaction.transaction_reference || `PAY-${transaction.id}`}</strong><small className="transaction-gateway">{transaction.gateway || 'recorded'} gateway</small></td><td>#{transaction.booking_id}</td><td>{transaction.origin} <span aria-hidden="true">→</span> {transaction.destination}</td><td>{formatDate(transaction.payment_date)}</td><td>{transaction.brand ? `${transaction.brand} ···· ${transaction.last_four}` : 'Not recorded'}</td><td>{money(transaction.amount)}</td><td><StatusBadge status={transaction.status} /></td></tr>)}</tbody></table></div> : <div className="booking-account-empty"><span aria-hidden="true">▤</span><h3>No transactions yet</h3><p>Payment records will appear here after a booking has a recorded transaction.</p></div>;

  const renderPaymentMethods = () => <>
    {paymentMethods.length ? <div className="saved-payment-list">{paymentMethods.map((method) => <article className="saved-payment-card" key={method.id}>
      <div className="payment-card-mark" aria-hidden="true">{(method.brand || 'CARD').slice(0, 4).toUpperCase()}</div>
      <div className="saved-payment-info"><div><strong>{method.brand || 'Payment method'}{method.last_four ? ` ending in ${method.last_four}` : ''}</strong>{method.is_default && <span className="account-default-tag">Default</span>}</div><span>{method.expiry_month && method.expiry_year ? `Expires ${String(method.expiry_month).padStart(2, '0')}/${method.expiry_year}` : 'Expiry not provided'} · via {method.gateway}</span></div>
      <div className="saved-payment-actions">{!method.is_default && <button type="button" className="account-secondary-link" disabled={Boolean(saving)} onClick={() => handleSetDefault(method)}>{saving === `default-${method.id}` ? 'Updating...' : 'Make default'}</button>}<button type="button" className="account-danger-link" disabled={saving === `method-${method.id}`} onClick={() => handleRemovePaymentMethod(method)}>{saving === `method-${method.id}` ? 'Removing...' : 'Remove'}</button></div>
    </article>)}</div> : <div className="booking-account-empty"><span aria-hidden="true">▣</span><h3>No saved payment methods</h3><p>Payment methods are stored by the payment provider as secure tokens. AeroBook does not store full card numbers or security codes.</p></div>}
    <aside className="gateway-notice"><strong>{gateway?.provider || 'Payment gateway unavailable'} · {gateway?.mode || 'offline'}</strong><p>This is a development sandbox. Charges and refunds are simulated and no real money moves. Card numbers and security codes are discarded after tokenization.</p><div className="gateway-test-card-list">{gateway?.test_cards?.map((card) => <span className="gateway-test-card" key={card.last_four}>{card.brand} ending {card.last_four}: {card.result}</span>)}</div></aside>
    <form className="sandbox-card-form" onSubmit={handleTokenizeCard}>
      <div><span className="booking-account-kicker">SANDBOX ONLY</span><h3>Add a test payment method</h3><p>Use one of the sandbox payment methods below. Card numbers and CVV are never stored.</p></div>
      <div className="sandbox-card-grid">
        <label>Method type<select value={paymentForm.payment_method_type} onChange={(event) => setPaymentForm((current) => ({ ...current, payment_method_type: event.target.value, wallet_name: event.target.value === 'wallet' ? current.wallet_name || 'bKash' : current.wallet_name, bank_name: event.target.value === 'bank_transfer' ? current.bank_name || 'City Bank' : current.bank_name }))}>
          <option value="card">Card</option>
          <option value="wallet">Mobile wallet</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="cod">Cash on delivery</option>
          <option value="wallet_balance">Wallet balance</option>
        </select></label>
        {paymentForm.payment_method_type === 'card' && <>
          <label>Cardholder name<input autoComplete="off" data-lpignore="true" data-1p-ignore="true" value={paymentForm.cardholder_name} onChange={(event) => setPaymentForm((current) => ({ ...current, cardholder_name: event.target.value }))} required /></label>
          <label>Test card number<input autoComplete="off" data-lpignore="true" data-1p-ignore="true" inputMode="numeric" value={paymentForm.card_number} onChange={(event) => setPaymentForm((current) => ({ ...current, card_number: event.target.value.replace(/[^\d ]/g, '').slice(0, 23) }))} required /></label>
          <label>Expiry month<select autoComplete="off" data-lpignore="true" data-1p-ignore="true" value={paymentForm.expiry_month} onChange={(event) => setPaymentForm((current) => ({ ...current, expiry_month: event.target.value }))}>{Array.from({ length: 12 }, (_, index) => String(index + 1)).map((month) => <option key={month} value={month}>{month.padStart(2, '0')}</option>)}</select></label>
          <label>Expiry year<input autoComplete="off" data-lpignore="true" data-1p-ignore="true" inputMode="numeric" value={paymentForm.expiry_year} onChange={(event) => setPaymentForm((current) => ({ ...current, expiry_year: event.target.value.replace(/\D/g, '').slice(0, 4) }))} required /></label>
          <label>Security code<input autoComplete="off" data-lpignore="true" data-1p-ignore="true" inputMode="numeric" value={paymentForm.security_code} onChange={(event) => setPaymentForm((current) => ({ ...current, security_code: event.target.value.replace(/\D/g, '').slice(0, 8) }))} required /></label>
        </>}
        {paymentForm.payment_method_type === 'wallet' && <>
          <label>Wallet name<select value={paymentForm.wallet_name} onChange={(event) => setPaymentForm((current) => ({ ...current, wallet_name: event.target.value }))}><option value="bKash">bKash</option><option value="Nagad">Nagad</option><option value="Rocket">Rocket</option></select></label>
          <label>Wallet number<input autoComplete="off" data-lpignore="true" data-1p-ignore="true" inputMode="numeric" value={paymentForm.wallet_reference} onChange={(event) => setPaymentForm((current) => ({ ...current, wallet_reference: event.target.value.replace(/\D/g, '').slice(0, 16) }))} required /></label>
        </>}
        {paymentForm.payment_method_type === 'bank_transfer' && <>
          <label>Bank<select value={paymentForm.bank_name} onChange={(event) => setPaymentForm((current) => ({ ...current, bank_name: event.target.value }))}><option value="City Bank">City Bank</option><option value="Dutch Bangla Bank">Dutch Bangla Bank</option><option value="BRAC Bank">BRAC Bank</option></select></label>
          <label>Account / routing reference<input autoComplete="off" data-lpignore="true" data-1p-ignore="true" value={paymentForm.wallet_reference} onChange={(event) => setPaymentForm((current) => ({ ...current, wallet_reference: event.target.value.slice(0, 24) }))} required /></label>
        </>}
        {paymentForm.payment_method_type === 'cod' && <>
          <label>Cash collection note<input value={paymentForm.wallet_reference} onChange={(event) => setPaymentForm((current) => ({ ...current, wallet_reference: event.target.value.slice(0, 80) }))} placeholder="Office pickup / address / payment deadline" required /></label>
        </>}
      </div>
      <label className="sandbox-default-check"><input type="checkbox" checked={paymentForm.make_default} onChange={(event) => setPaymentForm((current) => ({ ...current, make_default: event.target.checked }))} /> Make this my default method</label>
      <button type="submit" className="booking-find-flight" disabled={saving === 'tokenize'}>{saving === 'tokenize' ? 'Tokenizing...' : 'Save sandbox token'}</button>
    </form>
  </>;

  const renderRefunds = () => refunds.length ? <div className="refund-request-list">{refunds.map((refund) => <article className="refund-request-card" key={refund.id}>
    <div className="refund-request-heading"><div><span className="booking-account-kicker">REFUND REQUEST · BOOKING #{refund.booking_id}</span><h3>{refund.origin} <span aria-hidden="true">→</span> {refund.destination}</h3></div><StatusBadge status={refund.status} /></div>
    <div className="booking-account-details"><div><span>Requested</span><strong>{formatDate(refund.created_at)}</strong></div><div><span>Requested amount</span><strong>{money(refund.amount, refund.currency || 'USD')}</strong></div><div><span>Reason</span><strong>{refund.reason || 'Booking cancelled'}</strong></div>{refund.resolved_at && <div><span>Resolved</span><strong>{formatDate(refund.resolved_at)}</strong></div>}</div>
    <p className="refund-explainer">{String(refund.status).toLowerCase() === 'refunded' || String(refund.status).toLowerCase() === 'processed' ? 'The refund has been marked as processed.' : 'This request is recorded and awaiting review. The payment gateway has not confirmed a refund yet.'}</p>
  </article>)}</div> : <div className="booking-account-empty"><span aria-hidden="true">↺</span><h3>No refund requests</h3><p>If an eligible paid booking is cancelled, its refund request and status will be shown here.</p></div>;

  const activeSection = sections.find((item) => item.id === section);

  return (
    <div className="booking-account-shell">
      <nav className="navbar">
        <Link to="/home" className="logo">✈ AeroBook</Link>
        <div className="nav-links"><Link to="/home">Home</Link><Link to="/my-bookings">My Bookings</Link><Link to="/about-us">About</Link>{isAdmin && <button className="login-btn" onClick={() => navigate('/admin')}>Admin Panel</button>}</div>
        <div className="nav-buttons">{isAuthenticated && <UserProfileMenu />}</div>
      </nav>
      <main className="booking-account-page">
        <Link to="/home" className="info-back-link profile-back-link"><span className="info-back-icon" aria-hidden="true">←</span><span>Back to AeroBook</span></Link>
        <header className="booking-account-heading"><div><p className="profile-eyebrow">YOUR TRAVEL ACCOUNT</p><h1>My bookings</h1><p>Trips, payments, and refunds, all in one place.</p></div><button type="button" className="booking-find-flight" onClick={() => navigate('/home')}>＋ Find a flight</button></header>
        <nav className="booking-account-nav" aria-label="Booking account sections">{sections.map((item) => <button type="button" key={item.id} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}>{item.label}</button>)}</nav>
        {error && <div className="account-feedback account-feedback-error" role="alert">{error}<button type="button" onClick={refresh}>Try again</button></div>}
        {message && <div className="account-feedback account-feedback-success" role="status">{message}<button type="button" aria-label="Dismiss message" onClick={() => setMessage('')}>×</button></div>}
        <section className="booking-account-content">
          <div className="booking-section-title"><div><h2>{activeSection?.label || 'My bookings'}</h2><p>{section === 'bookings' ? `${bookings.length} reservation${bookings.length === 1 ? '' : 's'} in your account` : section === 'transactions' ? 'A clear record of your recorded payments' : section === 'payments' ? 'Provider-tokenized methods only' : 'Track each request from submission to resolution'}</p></div>{!loading && <button type="button" className="account-refresh-button" onClick={refresh} aria-label="Refresh account information" title="Refresh">↻</button>}</div>
          {loading ? <div className="account-loading"><span className="account-spinner" />Loading your account activity...</div> : section === 'bookings' ? renderBookings() : section === 'transactions' ? renderTransactions() : section === 'payments' ? renderPaymentMethods() : renderRefunds()}
        </section>
      </main>
    </div>
  );
}

export default MyBookingsPage;
