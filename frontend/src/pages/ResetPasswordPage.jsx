import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { requestPasswordReset, resetPassword } from '../api/auth';

function EyeButton({ visible, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
    >
      {visible ? '◉' : '◌'}
    </button>
  );
}

function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [step, setStep] = useState('request');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accountType = searchParams.get('account_type') === 'admin' ? 'admin' : 'user';

  const handleRequestCode = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await requestPasswordReset({ email, account_type: accountType });
      setMessage(response.message || 'A security code was sent to your email.');
      setStep('verify');
    } catch (err) {
      setError(err?.message || 'Unable to send the security code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await resetPassword({
        email,
        account_type: accountType,
        code,
        password,
        password_confirmation: passwordConfirmation,
      });
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setMessage(response.message || 'Password changed successfully.');
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setError(err?.message || 'Unable to reset the password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
          <p className="text-gray-600">
            {step === 'request' ? 'Request a security code' : 'Enter your code and choose a new password'}
          </p>
        </div>

        {message && <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{message}</div>}
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        {step === 'request' ? (
          <form onSubmit={handleRequestCode} className="space-y-6">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                id="reset-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="name@example.com"
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg">
              {loading ? 'Sending code...' : 'Send security code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label htmlFor="reset-code" className="block text-sm font-medium text-gray-700 mb-2">6-digit security code</label>
              <input
                type="text"
                id="reset-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength="6"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none tracking-widest"
                placeholder="123456"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">New password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength="8"
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <EyeButton visible={showPassword} onClick={() => setShowPassword(!showPassword)} label={showPassword ? 'Hide new password' : 'Show new password'} />
              </div>
            </div>
            <div>
              <label htmlFor="retype-password" className="block text-sm font-medium text-gray-700 mb-2">Retype password</label>
              <div className="relative">
                <input
                  type={showConfirmation ? 'text' : 'password'}
                  id="retype-password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  required
                  minLength="8"
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <EyeButton visible={showConfirmation} onClick={() => setShowConfirmation(!showConfirmation)} label={showConfirmation ? 'Hide retyped password' : 'Show retyped password'} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg">
              {loading ? 'Changing password...' : 'Change password'}
            </button>
          </form>
        )}

        <button type="button" onClick={() => navigate('/login')} className="w-full mt-6 text-sm text-blue-600 hover:underline">
          Back to login
        </button>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
