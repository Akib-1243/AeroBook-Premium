import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserProfileMenu from '../components/UserProfileMenu';

function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [passport, setPassport] = useState(user?.passport || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(() => localStorage.getItem('profile_avatar') || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPassport(user?.passport || '');
    setPhone(user?.phone || '');
  }, [user]);

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Please choose a JPG or PNG image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Please choose an image smaller than 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = String(reader.result);
      localStorage.setItem('profile_avatar', image);
      setAvatar(image);
      window.dispatchEvent(new Event('aerobook-avatar-updated'));
      setError('');
      setMessage('Profile picture updated.');
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    localStorage.removeItem('profile_avatar');
    setAvatar('');
    window.dispatchEvent(new Event('aerobook-avatar-updated'));
    setMessage('Profile picture removed.');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await updateProfile({ name, email, passport, phone });
      setMessage('Your profile has been updated.');
    } catch (err) {
      setError(err?.message || 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  };

  const initials = name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className="profile-page-shell">
      <nav className="navbar profile-navbar">
        <Link to="/home" className="logo">✈ AeroBook</Link>
        <div className="profile-navbar-actions">
          <Link to="/my-bookings" className="profile-bookings-link">My bookings</Link>
          <UserProfileMenu />
        </div>
      </nav>

      <main className="profile-page">
        <Link to="/home" className="info-back-link profile-back-link">
          <span className="info-back-icon" aria-hidden="true">←</span>
          <span>Back to AeroBook</span>
        </Link>

        <div className="profile-page-heading">
          <div>
            <p className="profile-eyebrow">YOUR AEROBOOK ACCOUNT</p>
            <h1>Profile & preferences</h1>
            <p>Keep your traveler details ready for faster, smoother bookings.</p>
          </div>
          <button type="button" className="profile-search-button" onClick={() => navigate('/home')}>Search flights</button>
        </div>

        <div className="profile-layout">
          <aside className="profile-summary-panel">
            <div className="profile-large-avatar">
              {avatar ? <img src={avatar} alt="Your profile" /> : <span>{initials}</span>}
            </div>
            <h2>{name || 'AeroBook traveler'}</h2>
            <p>{email}</p>
            <label className="avatar-upload-button">
              Change photo
              <input type="file" accept="image/jpeg,image/png" onChange={handleAvatarChange} />
            </label>
            {avatar && <button type="button" className="avatar-remove-button" onClick={removeAvatar}>Remove photo</button>}
            <div className="profile-summary-links">
              <Link to="/my-bookings">View booking history <span>→</span></Link>
              <Link to="/home">Book a new flight <span>→</span></Link>
            </div>
          </aside>

          <section className="profile-form-panel">
            <div className="profile-section-heading">
              <div>
                <p className="profile-eyebrow">ACCOUNT DETAILS</p>
                <h2>Personal information</h2>
              </div>
              <span className="profile-secure-label">Secure account</span>
            </div>

            {message && <div className="profile-success">{message}</div>}
            {error && <div className="profile-error">{error}</div>}

            <form onSubmit={handleSubmit} className="profile-form">
              <div className="profile-form-grid">
                <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
                <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
                <label>Passport number<input value={passport} onChange={(event) => setPassport(event.target.value)} placeholder="For faster checkout" required /></label>
                <label>Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional" /></label>
              </div>
              <div className="profile-form-footer">
                <p>Your information is used to prepare passenger details during booking.</p>
                <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
