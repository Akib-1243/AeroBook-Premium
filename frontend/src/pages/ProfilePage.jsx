import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserProfileMenu from '../components/UserProfileMenu';
import {
  addSavedTraveler,
  changeAccountPassword,
  deleteProfileAccount,
  getProfileDetails,
  getProfileSessions,
  removeSavedTraveler,
  revokeProfileSession,
  saveNotificationPreferences,
  sendEmailVerificationCode,
  updateSavedTraveler,
  verifyProfileEmail,
} from '../api/profile';

const sections = [
  { id: 'personal', title: 'Personal information', path: '/profile/personal' },
  { id: 'contact', title: 'Contact information', path: '/profile/contact' },
  { id: 'travel-documents', title: 'Travel documents', path: '/profile/travel-documents' },
  { id: 'travelers', title: 'Saved travelers', path: '/profile/travelers' },
  { id: 'security', title: 'Account and security', path: '/profile/security' },
];

const emptyTraveler = {
  title: '', first_name: '', last_name: '', date_of_birth: '', gender: '', nationality: '',
  passport_number: '', passport_issuing_country: '', passport_issue_date: '',
  passport_expiry_date: '', national_id: '', visa_information: '',
};

function ProfileField({ label, value, onChange, type = 'text', required = false, placeholder = '', children }) {
  return (
    <label className="profile-field">
      <span>{label}</span>
      {children || <input type={type} value={value ?? ''} onChange={onChange} required={required} placeholder={placeholder} />}
    </label>
  );
}

function ProfilePage() {
  const { section = 'personal' } = useParams();
  const { user, updateProfile, clearAuth } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ ...emptyTraveler, email: '', phone: '' });
  const [verifiedAt, setVerifiedAt] = useState(null);
  const [travelers, setTravelers] = useState([]);
  const [preferences, setPreferences] = useState({ email_notifications: true, sms_notifications: false });
  const [sessions, setSessions] = useState([]);
  const [history, setHistory] = useState([]);
  const [editingTraveler, setEditingTraveler] = useState(null);
  const [travelerForm, setTravelerForm] = useState(emptyTraveler);
  const [verificationCode, setVerificationCode] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [avatar, setAvatar] = useState(() => localStorage.getItem('profile_avatar') || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getProfileDetails()
      .then((result) => {
        if (!active) return;
        const fallbackName = (user?.name || '').trim().split(/\s+/);
        setProfile({
          ...emptyTraveler,
          ...(result.profile || {}),
          first_name: result.profile?.first_name || fallbackName[0] || '',
          last_name: result.profile?.last_name || fallbackName.slice(1).join(' '),
          passport_number: result.profile?.passport_number || user?.passenger?.passport || user?.passport || '',
          email: result.contact?.email || user?.email || '',
          phone: result.contact?.phone || user?.phone || '',
          date_of_birth: result.profile?.date_of_birth?.slice(0, 10) || '',
          passport_issue_date: result.profile?.passport_issue_date?.slice(0, 10) || '',
          passport_expiry_date: result.profile?.passport_expiry_date?.slice(0, 10) || '',
        });
        setVerifiedAt(result.contact?.email_verified_at || null);
        setTravelers(result.travelers || []);
        setPreferences({
          email_notifications: Boolean(result.preferences?.email_notifications ?? true),
          sms_notifications: Boolean(result.preferences?.sms_notifications ?? false),
        });
      })
      .catch((loadError) => setError(loadError.message || 'Could not load your profile.'))
      .finally(() => { if (active) setLoading(false); });

    getProfileSessions()
      .then((result) => {
        if (active) {
          setSessions(result.sessions || []);
          setHistory(result.login_history || []);
        }
      })
      .catch(() => {});

    return () => { active = false; };
  }, [user]);

  const setField = (field, value) => setProfile((current) => ({ ...current, [field]: value }));
  const setTravelerField = (field, value) => setTravelerForm((current) => ({ ...current, [field]: value }));

  const runAction = async (action, successMessage) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await action();
      setMessage(result?.message || successMessage);
      return result;
    } catch (actionError) {
      setError(actionError.message || 'The change could not be saved.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    await runAction(async () => {
      const result = await updateProfile(profile);
      setVerifiedAt(result.user?.email_verified_at || null);
      return result;
    }, 'Your information has been saved.');
  };

  const handleEmailCode = async () => {
    const result = await runAction(() => sendEmailVerificationCode(profile.email), 'Verification code sent.');
    if (result) setMessage(result.message || 'Verification code sent. Check your inbox.');
  };

  const handleEmailVerify = async (event) => {
    event.preventDefault();
    const result = await runAction(() => verifyProfileEmail(verificationCode), 'Email verified.');
    if (result) setVerifiedAt(new Date().toISOString());
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Choose a JPG or PNG image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Choose an image smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = String(reader.result);
      localStorage.setItem('profile_avatar', image);
      setAvatar(image);
      window.dispatchEvent(new Event('aerobook-avatar-updated'));
    };
    reader.readAsDataURL(file);
  };

  const handleTravelerSave = async (event) => {
    event.preventDefault();
    const result = await runAction(
      () => editingTraveler ? updateSavedTraveler(editingTraveler, travelerForm) : addSavedTraveler(travelerForm),
      'Traveler saved.',
    );
    if (result?.traveler) {
      setTravelers((current) => editingTraveler
        ? current.map((traveler) => traveler.id === editingTraveler ? result.traveler : traveler)
        : [...current, result.traveler]);
      setEditingTraveler(null);
      setTravelerForm(emptyTraveler);
    }
  };

  const startEditTraveler = (traveler) => {
    setEditingTraveler(traveler.id);
    setTravelerForm({ ...emptyTraveler, ...traveler,
      date_of_birth: traveler.date_of_birth?.slice(0, 10) || '',
      passport_issue_date: traveler.passport_issue_date?.slice(0, 10) || '',
      passport_expiry_date: traveler.passport_expiry_date?.slice(0, 10) || '',
    });
    setMessage('');
  };

  const handleTravelerRemove = async (travelerId) => {
    const result = await runAction(() => removeSavedTraveler(travelerId), 'Saved traveler removed.');
    if (result) setTravelers((current) => current.filter((traveler) => traveler.id !== travelerId));
  };

  const handlePreferences = async (event) => {
    event.preventDefault();
    await runAction(() => saveNotificationPreferences(preferences), 'Notification preferences saved.');
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    const result = await runAction(() => changeAccountPassword(passwordForm), 'Password changed.');
    if (result) setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
  };

  const handleRevokeSession = async (sessionId) => {
    const result = await runAction(() => revokeProfileSession(sessionId), 'Session revoked.');
    if (result) {
      setSessions((current) => current.filter((session) => session.id !== sessionId));
      if (sessions.find((session) => session.id === sessionId)?.current) {
        clearAuth();
        navigate('/login', { replace: true });
      }
    }
  };

  const handleDeleteAccount = async (event) => {
    event.preventDefault();
    if (deleteConfirm !== 'DELETE') {
      setError('Type DELETE to confirm account removal.');
      return;
    }
    const result = await runAction(() => deleteProfileAccount(deletePassword), 'Account deleted.');
    if (result) {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  const initials = (user?.name || profile.first_name || 'U').trim().charAt(0).toUpperCase();
  const heading = sections.find((item) => item.id === section)?.title || 'Profile';

  const renderNameFields = () => (
    <>
      <ProfileField label="Title">
        <select value={profile.title || ''} onChange={(event) => setField('title', event.target.value)}>
          <option value="">Select title</option><option>Mr</option><option>Mrs</option><option>Ms</option><option>Mx</option><option>Dr</option>
        </select>
      </ProfileField>
      <ProfileField label="First name (as shown on passport)" value={profile.first_name} required onChange={(event) => setField('first_name', event.target.value)} />
      <ProfileField label="Last name (as shown on passport)" value={profile.last_name} required onChange={(event) => setField('last_name', event.target.value)} />
      <ProfileField label="Date of birth" type="date" value={profile.date_of_birth} onChange={(event) => setField('date_of_birth', event.target.value)} />
      <ProfileField label="Gender">
        <select value={profile.gender || ''} onChange={(event) => setField('gender', event.target.value)}>
          <option value="">Select gender</option><option>Female</option><option>Male</option><option>Unspecified</option>
        </select>
      </ProfileField>
      <ProfileField label="Nationality" value={profile.nationality} onChange={(event) => setField('nationality', event.target.value)} placeholder="Country of citizenship" />
    </>
  );

  const renderDocumentFields = (form, change) => (
    <>
      <ProfileField label="Passport number" value={form.passport_number} onChange={(event) => change('passport_number', event.target.value)} />
      <ProfileField label="Issuing country" value={form.passport_issuing_country} onChange={(event) => change('passport_issuing_country', event.target.value)} />
      <ProfileField label="Issue date" type="date" value={form.passport_issue_date} onChange={(event) => change('passport_issue_date', event.target.value)} />
      <ProfileField label="Expiry date" type="date" value={form.passport_expiry_date} onChange={(event) => change('passport_expiry_date', event.target.value)} />
      <ProfileField label="National ID (domestic flights)" value={form.national_id} onChange={(event) => change('national_id', event.target.value)} />
      <ProfileField label="Visa information (optional)" value={form.visa_information} onChange={(event) => change('visa_information', event.target.value)} placeholder="Visa type, country, or notes" />
    </>
  );

  const renderSection = () => {
    if (loading) return <p className="profile-loading">Loading account details...</p>;
    if (section === 'personal') {
      return <form onSubmit={saveProfile} className="profile-form">
        <div className="profile-form-grid">{renderNameFields()}</div>
        <div className="profile-form-footer"><p>Enter names and birth details exactly as they appear on your passport.</p><button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save personal information'}</button></div>
      </form>;
    }
    if (section === 'contact') {
      return <>
        <form onSubmit={saveProfile} className="profile-form">
          <div className="profile-form-grid">
            <ProfileField label="Email address" type="email" value={profile.email} required onChange={(event) => setField('email', event.target.value)} />
            <ProfileField label="Phone number (include country code)" type="tel" value={profile.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="+880 1XXXXXXXXX" />
            <ProfileField label="Address (optional)" value={profile.address} onChange={(event) => setField('address', event.target.value)} />
          </div>
          <div className="profile-form-footer"><p>Changing your email clears its verified status until you confirm a new code.</p><button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save contact information'}</button></div>
        </form>
        <div className="profile-verification-row">
          <div><strong>Email verification</strong><span className={verifiedAt ? 'profile-status profile-status-good' : 'profile-status'}>{verifiedAt ? 'Verified' : 'Not verified'}</span></div>
          {!verifiedAt && <button type="button" className="profile-secondary-button" onClick={handleEmailCode} disabled={saving}>Send email code</button>}
        </div>
        {!verifiedAt && <form onSubmit={handleEmailVerify} className="profile-inline-form">
          <ProfileField label="6-digit email code" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter code from your inbox" />
          <button type="submit" className="profile-secondary-button" disabled={saving || verificationCode.length !== 6}>Verify email</button>
        </form>}
        <div className="profile-verification-row"><div><strong>Phone verification</strong><span className="profile-status">Not verified</span></div><p>SMS verification is unavailable until an SMS delivery provider is configured.</p></div>
      </>;
    }
    if (section === 'travel-documents') {
      return <form onSubmit={saveProfile} className="profile-form">
        <div className="profile-form-grid">{renderDocumentFields(profile, setField)}</div>
        <div className="profile-form-footer"><p>Keep document details current. Check the expiry date before booking international travel.</p><button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save travel documents'}</button></div>
      </form>;
    }
    if (section === 'travelers') {
      return <div className="profile-travelers-section">
        <div className="profile-traveler-list">
          {travelers.length === 0 && <p className="profile-empty-state">No saved travelers yet.</p>}
          {travelers.map((traveler) => <article className="profile-traveler-row" key={traveler.id}>
            <div><strong>{traveler.title ? `${traveler.title} ` : ''}{traveler.first_name} {traveler.last_name}</strong><span>{traveler.nationality || 'Nationality not added'}{traveler.passport_number ? ` · Passport ending ${traveler.passport_number.slice(-4)}` : ''}</span></div>
            <div className="profile-row-actions"><button type="button" className="profile-text-button" onClick={() => startEditTraveler(traveler)}>Edit</button><button type="button" className="profile-text-button profile-danger-text" onClick={() => handleTravelerRemove(traveler.id)}>Remove</button></div>
          </article>)}
        </div>
        <form onSubmit={handleTravelerSave} className="profile-form profile-traveler-form">
          <h3>{editingTraveler ? 'Edit saved traveler' : 'Add a traveler'}</h3>
          <div className="profile-form-grid">
            <ProfileField label="Title"><select value={travelerForm.title || ''} onChange={(event) => setTravelerField('title', event.target.value)}><option value="">Select title</option><option>Mr</option><option>Mrs</option><option>Ms</option><option>Mx</option><option>Dr</option></select></ProfileField>
            <ProfileField label="First name (as shown on passport)" value={travelerForm.first_name} required onChange={(event) => setTravelerField('first_name', event.target.value)} />
            <ProfileField label="Last name (as shown on passport)" value={travelerForm.last_name} required onChange={(event) => setTravelerField('last_name', event.target.value)} />
            <ProfileField label="Date of birth" type="date" value={travelerForm.date_of_birth} onChange={(event) => setTravelerField('date_of_birth', event.target.value)} />
            <ProfileField label="Gender"><select value={travelerForm.gender || ''} onChange={(event) => setTravelerField('gender', event.target.value)}><option value="">Select gender</option><option>Female</option><option>Male</option><option>Unspecified</option></select></ProfileField>
            <ProfileField label="Nationality" value={travelerForm.nationality} onChange={(event) => setTravelerField('nationality', event.target.value)} />
            {renderDocumentFields(travelerForm, setTravelerField)}
          </div>
          <div className="profile-form-footer"><p>Saved traveler details are private to your account and can be updated or removed here.</p><div className="profile-row-actions"><button type="button" className="profile-secondary-button" onClick={() => { setEditingTraveler(null); setTravelerForm(emptyTraveler); }}>Clear</button><button type="submit" disabled={saving}>{saving ? 'Saving...' : editingTraveler ? 'Save traveler' : 'Add traveler'}</button></div></div>
        </form>
      </div>;
    }
    if (section === 'security') {
      return <div className="profile-security-section">
        <form onSubmit={handlePasswordChange} className="profile-form">
          <h3>Change password</h3>
          <div className="profile-form-grid">
            <ProfileField label="Current password" type="password" value={passwordForm.current_password} required onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))} />
            <ProfileField label="New password" type="password" value={passwordForm.password} required onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))} />
            <ProfileField label="Confirm new password" type="password" value={passwordForm.password_confirmation} required onChange={(event) => setPasswordForm((current) => ({ ...current, password_confirmation: event.target.value }))} />
          </div>
          <div className="profile-form-footer"><p>Use at least 8 characters. Other active sessions are signed out after a password change.</p><button type="submit" disabled={saving}>{saving ? 'Updating...' : 'Change password'}</button></div>
        </form>
        <section className="profile-security-block">
          <div><h3>Two-factor authentication</h3><p>Additional sign-in verification is not configured for this account yet.</p></div><span className="profile-status">Not enabled</span>
        </section>
        <form onSubmit={handlePreferences} className="profile-form">
          <h3>Notification settings</h3>
          <label className="profile-toggle-row"><span><strong>Email notifications</strong><small>Booking and account updates</small></span><input type="checkbox" checked={preferences.email_notifications} onChange={(event) => setPreferences((current) => ({ ...current, email_notifications: event.target.checked }))} /></label>
          <label className="profile-toggle-row"><span><strong>SMS notifications</strong><small>Requires a verified phone and configured SMS provider</small></span><input type="checkbox" checked={preferences.sms_notifications} onChange={(event) => setPreferences((current) => ({ ...current, sms_notifications: event.target.checked }))} disabled /></label>
          <div className="profile-form-footer"><p>SMS delivery is not configured for this environment.</p><button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save notifications'}</button></div>
        </form>
        <section className="profile-security-block profile-session-block">
          <div><h3>Active sessions</h3><p>Revoke sign-ins you no longer recognize.</p></div>
          {sessions.length ? sessions.map((session) => <div className="profile-session-row" key={session.id}>
            <div><strong>{session.name || 'AeroBook session'} {session.current && <span className="profile-status profile-status-good">This device</span>}</strong><small>Signed in {new Date(session.created_at).toLocaleString()}{session.last_used_at ? ` · Last active ${new Date(session.last_used_at).toLocaleString()}` : ''}</small></div>
            <button type="button" className="profile-text-button profile-danger-text" onClick={() => handleRevokeSession(session.id)}>Revoke</button>
          </div>) : <p className="profile-empty-state">No active sessions were found.</p>}
        </section>
        <section className="profile-security-block profile-session-block">
          <div><h3>Login history</h3><p>Recent successful sign-ins for this account.</p></div>
          {history.length ? history.map((entry, index) => <div className="profile-session-row" key={`${entry.logged_in_at}-${index}`}>
            <div><strong>{new Date(entry.logged_in_at).toLocaleString()}</strong><small>{entry.ip_address || 'IP not available'} · {entry.user_agent || 'Browser not reported'}</small></div>
          </div>) : <p className="profile-empty-state">No sign-in history has been recorded yet.</p>}
        </section>
        <form onSubmit={handleDeleteAccount} className="profile-delete-block">
          <div><h3>Delete account</h3><p>Your login and saved traveler details will be removed. Existing booking records are retained for service and accounting records.</p></div>
          <div className="profile-form-grid">
            <ProfileField label="Current password" type="password" value={deletePassword} required onChange={(event) => setDeletePassword(event.target.value)} />
            <ProfileField label="Type DELETE to confirm" value={deleteConfirm} required onChange={(event) => setDeleteConfirm(event.target.value)} />
          </div>
          <button type="submit" disabled={saving} className="profile-delete-button">{saving ? 'Deleting...' : 'Delete my account'}</button>
        </form>
      </div>;
    }
    return <p className="profile-empty-state">This profile section is unavailable.</p>;
  };

  return (
    <div className="profile-page-shell">
      <nav className="navbar profile-navbar">
        <Link to="/home" className="logo">✈ AeroBook</Link>
        <div className="profile-navbar-actions"><Link to="/my-bookings" className="profile-bookings-link">My bookings</Link><UserProfileMenu /></div>
      </nav>
      <main className="profile-page">
        <Link to="/home" className="info-back-link profile-back-link"><span className="info-back-icon" aria-hidden="true">←</span><span>Back to AeroBook</span></Link>
        <div className="profile-page-heading">
          <div><p className="profile-eyebrow">YOUR AEROBOOK ACCOUNT</p><h1>Profile & preferences</h1><p>Manage traveler details, saved companions, and account access.</p></div>
          <button type="button" className="profile-search-button" onClick={() => navigate('/home')}>Search flights</button>
        </div>
        <div className="profile-layout">
          <aside className="profile-summary-panel">
            <div className="profile-large-avatar">{avatar ? <img src={avatar} alt="Your profile" /> : <span>{initials}</span>}</div>
            <h2>{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || user?.name || 'AeroBook traveler'}</h2><p>{profile.email || user?.email}</p>
            <label className="avatar-upload-button">Change photo<input type="file" accept="image/jpeg,image/png" onChange={handleAvatarChange} /></label>
            {avatar && <button type="button" className="avatar-remove-button" onClick={() => { localStorage.removeItem('profile_avatar'); setAvatar(''); window.dispatchEvent(new Event('aerobook-avatar-updated')); }}>Remove photo</button>}
            <div className="profile-summary-links"><Link to="/my-bookings">View booking history <span>→</span></Link><Link to="/home">Book a new flight <span>→</span></Link></div>
          </aside>
          <section className="profile-form-panel">
            <div className="profile-section-heading"><div><p className="profile-eyebrow">ACCOUNT DETAILS</p><h2>{heading}</h2></div><span className="profile-secure-label">Private account</span></div>
            <nav className="profile-section-nav" aria-label="Profile sections">{sections.map((item) => <Link key={item.id} to={item.path} className={section === item.id ? 'active' : ''}>{item.title}</Link>)}</nav>
            {message && <div className="profile-success" role="status">{message}</div>}
            {error && <div className="profile-error" role="alert">{error}</div>}
            {renderSection()}
          </section>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
