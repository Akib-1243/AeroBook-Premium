import { Link, useLocation } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter';

const pageContent = {
  '/refund-policy': {
    title: 'Refund Policy',
    intro: 'Clear, fair options when your travel plans change.',
    sections: [
      ['Before departure', 'Refund eligibility depends on the fare rules shown before payment. Eligible cancellations are returned to the original payment method.'],
      ['How long refunds take', 'Once approved, AeroBook starts the refund promptly. Your bank or card provider may need additional business days to display it.'],
      ['Flight changes', 'If an airline changes or cancels your flight, our support team will help you choose an available alternative or understand your refund options.'],
    ],
  },
  '/terms': {
    title: 'Terms & Conditions',
    intro: 'The simple ground rules for using AeroBook.',
    sections: [
      ['Your account', 'Keep your login details accurate and private. You are responsible for activity completed through your account.'],
      ['Bookings and payment', 'A booking is confirmed after payment is accepted and a confirmation is issued. Airline fare rules apply to changes, cancellations, and baggage.'],
      ['Using AeroBook responsibly', 'Please provide truthful passenger information and do not misuse the booking, payment, or support services.'],
    ],
  },
  '/emi-policy': {
    title: 'EMI Policy',
    intro: 'Flexible payment information for eligible cards and plans.',
    sections: [
      ['Eligibility', 'EMI availability depends on your bank, card type, transaction amount, and the payment options shown at checkout.'],
      ['Charges', 'Your bank may apply interest, processing fees, or early-settlement fees. Review the bank terms before confirming an EMI plan.'],
      ['Cancellations', 'A booking refund does not automatically cancel an EMI plan. Contact your bank for the exact settlement process.'],
    ],
  },
  '/privacy-policy': {
    title: 'Privacy Policy',
    intro: 'How AeroBook handles the information needed to run your trips.',
    sections: [
      ['Information we use', 'We use account, passenger, booking, and payment-status information to provide reservations, support, and security.'],
      ['Keeping information safe', 'Passwords are stored securely, and access to account information is limited to the services that need it.'],
      ['Your choices', 'You can request help with your account information through our support contact. We do not sell your personal information.'],
    ],
  },
  '/about-us': {
    title: 'About AeroBook',
    intro: 'A focused booking experience built to make air travel easier to manage.',
    sections: [
      ['Our purpose', 'AeroBook brings flight discovery, booking, passenger details, and booking history into one clear experience.'],
      ['Designed for confidence', 'We keep the important details visible so you can compare flights, confirm passenger information, and understand the next step.'],
      ['Here when plans move', 'Travel changes. Our support and booking tools are designed to help you act quickly when they do.'],
    ],
  },
  '/experience-center': {
    title: 'Experience Center',
    intro: 'Find practical help for your next trip.',
    sections: [
      ['Booking support', 'Get help with finding flights, passenger information, seat selection, and booking confirmation.'],
      ['Payment support', 'We can help you understand payment status, eligible methods, and the next step when a transaction needs attention.'],
      ['Contact our team', 'Email info@aerobook.com or call +88 09678 332211 for assistance with an AeroBook booking.'],
    ],
  },
};

function InformationPage() {
  const location = useLocation();
  const content = pageContent[location.pathname] || pageContent['/about-us'];

  return (
    <div className="info-page-shell">
      <main className="info-page">
        <Link to="/home" className="info-back-link">
          <span className="info-back-icon" aria-hidden="true">←</span>
          <span>Return to AeroBook</span>
        </Link>
        <p className="info-eyebrow">AEROBOOK INFORMATION</p>
        <h1>{content.title}</h1>
        <p className="info-intro">{content.intro}</p>
        <div className="info-sections">
          {content.sections.map(([heading, text]) => (
            <section key={heading} className="info-section">
              <h2>{heading}</h2>
              <p>{text}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export default InformationPage;
