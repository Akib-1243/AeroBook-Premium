import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function UserProfileMenu() {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState(() => localStorage.getItem('profile_avatar') || '');
  const initials = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U';

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    const handleAvatarUpdate = () => setAvatar(localStorage.getItem('profile_avatar') || '');
    window.addEventListener('aerobook-avatar-updated', handleAvatarUpdate);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('aerobook-avatar-updated', handleAvatarUpdate);
    };
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/home');
  };

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        type="button"
        className="profile-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        {avatar ? <img src={avatar} alt="Profile" /> : <span>{initials}</span>}
        <span className="profile-trigger-name">{user?.name || 'Profile'}</span>
        <span className="profile-chevron" aria-hidden="true">⌄</span>
      </button>

      {open && (
        <div className="profile-dropdown">
          <div className="profile-dropdown-heading">
            <strong>{user?.name || 'AeroBook user'}</strong>
            <span>{user?.email}</span>
          </div>
          {!isAdmin && <Link to="/profile" onClick={() => setOpen(false)}>My profile</Link>}
          {!isAdmin && <Link to="/my-bookings" onClick={() => setOpen(false)}>My bookings</Link>}
          {isAdmin && <Link to="/admin" onClick={() => setOpen(false)}>Admin dashboard</Link>}
          <button type="button" className="profile-logout" onClick={handleLogout}>Log out</button>
        </div>
      )}
    </div>
  );
}

export default UserProfileMenu;
