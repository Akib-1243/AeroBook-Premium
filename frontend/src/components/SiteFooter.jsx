import { Link } from 'react-router-dom';

const paymentMethods = ['VISA', 'AMEX', 'Mastercard', 'UnionPay', 'DBBL', 'bKash', 'Nagad', 'upay', 'tap'];

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div className="site-footer-brand">
          <Link to="/home" className="site-footer-logo">✈ AeroBook</Link>
          <p>Simple, secure flight booking for every journey.</p>
          <span>© 2026 AeroBook. All rights reserved.</span>
        </div>

        <div className="site-footer-column">
          <h3>Discover</h3>
          <Link to="/home">Home</Link>
          <Link to="/refund-policy">Refund Policy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/emi-policy">EMI Policy</Link>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/about-us">About Us</Link>
        </div>

        <div className="site-footer-column payment-column">
          <h3>Payment Methods</h3>
          <div className="payment-methods" aria-label="Accepted payment methods">
            {paymentMethods.map((method) => <span key={method} className="payment-method">{method}</span>)}
          </div>
        </div>

        <div className="site-footer-column">
          <h3>Need Help?</h3>
          <p>We are here for you 24/7. Reach out whenever you need support with your booking.</p>
          <Link to="/experience-center" className="footer-secondary-link">Experience Center</Link>
          <Link to="/experience-center">Locate a center near you</Link>
        </div>

        <div className="site-footer-column contact-column">
          <h3>Contact</h3>
          <a href="mailto:info@aerobook.com">info@aerobook.com</a>
          <a href="tel:+8809678332211">+88 09678 332211</a>
          <div className="social-links" aria-label="Social media login links">
            <Link to="/social-login/facebook" aria-label="Facebook login">f</Link>
            <Link to="/social-login/youtube" aria-label="YouTube login">▶</Link>
            <Link to="/social-login/instagram" aria-label="Instagram login">◎</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
