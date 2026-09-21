import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const socialPlatforms = {
  facebook: { name: 'Facebook', mark: 'f', color: '#1877f2' },
  youtube: { name: 'YouTube', mark: '▶', color: '#ff0000' },
  instagram: { name: 'Instagram', mark: '◎', color: '#c13584' },
};

function SocialLoginPage() {
  const { platform } = useParams();
  const social = socialPlatforms[platform] || socialPlatforms.facebook;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="social-login-page">
      <section className="social-login-card">
        <div className="social-brand-mark" style={{ backgroundColor: social.color }}>{social.mark}</div>
        <p className="info-eyebrow">AEROBOOK SOCIAL</p>
        <h1>Sign in with {social.name}</h1>
        <p className="social-login-copy">Use your {social.name} account to continue to AeroBook.</p>
        {submitted && <p className="social-demo-message">This social login form is ready for connection to the {social.name} provider.</p>}
        <form onSubmit={handleSubmit} className="social-login-form">
          <label htmlFor="social-email">Email or phone</label>
          <input id="social-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="social-password">Password</label>
          <input id="social-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button type="submit" style={{ backgroundColor: social.color }}>Log in</button>
        </form>
        <Link to="/home" className="social-back-link">Back to AeroBook</Link>
      </section>
    </main>
  );
}

export default SocialLoginPage;
