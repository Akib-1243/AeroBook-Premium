import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getProfileDetails } from '../../api/profile';
import { getSavedPaymentMethods, tokenizeSandboxPaymentMethod } from '../../api/bookingAccount';

const normalizeDefaultFlag = (value) => value === true || value === 1 || value === '1';
const normalizePaymentMethods = (methods = []) => methods.map((method) => ({
  ...method,
  is_default: normalizeDefaultFlag(method?.is_default),
}));

const emptySandboxCard = () => ({
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

// Traveler + payment step shown after seats are picked. mode 'book' only needs a traveler
// (payment happens later from My Bookings); mode 'buy' also charges a saved sandbox method.
function CheckoutModal({ flight, seats, mode, submitting, error, onClose, onConfirm }) {
  const { user } = useAuth();
  const needsPayment = mode === 'buy';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savedTravelers, setSavedTravelers] = useState([]);
  const [selectedTravelerId, setSelectedTravelerId] = useState('');
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [sandboxCard, setSandboxCard] = useState(emptySandboxCard);
  const [tokenizingCard, setTokenizingCard] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getProfileDetails(), needsPayment ? getSavedPaymentMethods() : Promise.resolve({ data: [] })])
      .then(([profile, paymentResult]) => {
        if (!active) return;
        setSavedTravelers(profile.travelers || []);
        const methods = normalizePaymentMethods(paymentResult.data || []);
        setSavedPaymentMethods(methods);
        setSelectedPaymentMethodId(String(methods.find((method) => method.is_default)?.id || methods[0]?.id || ''));
      })
      .catch((err) => active && setLoadError(err.message || 'Traveler details could not be loaded.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [needsPayment]);

  const currency = flight?.currency || 'USD';
  const total = seats.reduce((sum, seat) => sum + Number(flight?.base_fare || 0) + (Number(seat.surcharge) || 0), 0);

  const tokenizeSandboxCard = async () => {
    setTokenizingCard(true);
    setLocalError('');
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
      setSandboxCard(emptySandboxCard());
    } catch (err) {
      setLocalError(err.message || 'The sandbox card could not be tokenized.');
    } finally {
      setTokenizingCard(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (needsPayment && !selectedPaymentMethodId) {
      setLocalError('Add or select a sandbox payment method to continue.');
      return;
    }
    setLocalError('');
    onConfirm({
      travelerId: selectedTravelerId || null,
      paymentMethodId: needsPayment ? Number(selectedPaymentMethodId) : null,
    });
  };

  const shownError = localError || error || loadError;

  return (
    <div className="booking-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !submitting) onClose();
    }}>
      <section className="booking-traveler-modal" role="dialog" aria-modal="true" aria-labelledby="booking-traveler-title">
        <button type="button" className="booking-modal-close" aria-label="Close traveler selection" onClick={onClose}>×</button>
        <p className="profile-eyebrow">PASSENGER DETAILS</p>
        <h2 id="booking-traveler-title">Who is traveling?</h2>
        <p>
          {needsPayment
            ? 'Select the traveler and sandbox payment method for this reservation. Charges are simulated only.'
            : 'Select the traveler for this reservation. Your seats are held until you pay from My Bookings.'}
        </p>
        {loading ? <p>Loading traveler details...</p> : (
          <form onSubmit={handleSubmit}>
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
              <div>
                <span className="profile-eyebrow">{needsPayment ? 'PAYMENT' : 'TOTAL DUE LATER'}</span>
                <strong>
                  {seats.length} {seats.length === 1 ? 'seat' : 'seats'} · {needsPayment ? 'Sandbox total' : 'Total'}: {new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(total)}
                </strong>
              </div>
              {needsPayment && <>
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
                  <button type="button" className="profile-secondary-button" disabled={tokenizingCard || (sandboxCard.payment_method_type === 'card' && (!sandboxCard.cardholder_name || !sandboxCard.card_number || !sandboxCard.security_code))} onClick={tokenizeSandboxCard}>{tokenizingCard ? 'Tokenizing...' : 'Tokenize test card'}</button>
                </details>
              </>}
            </div>
            {shownError && <p className="booking-modal-error" role="alert">{shownError}</p>}
            <div className="booking-modal-actions">
              <button type="button" className="booking-modal-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
              <button type="submit" className="search-btn" disabled={submitting}>
                {submitting ? (needsPayment ? 'Processing...' : 'Booking...') : (needsPayment ? 'Pay and confirm' : 'Hold seats')}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export default CheckoutModal;
