import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { adminLogin, logout, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      navigate('/admin', { replace: true });
      return;
    }

    if (isAuthenticated && !isAdmin) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await adminLogin({ email, password });
      const loggedInUser = response?.user || JSON.parse(localStorage.getItem('user') || 'null');

      if (!loggedInUser || loggedInUser.role !== 'admin') {
        await logout();
        setError('Admin account required to access the admin panel.');
        return;
      }

      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err?.message || 'Admin login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 text-2xl font-bold mb-4">
            ★
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AeroBook Admin</h1>
          <p className="text-gray-600">Secure administrator access</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-2">
              Admin Email
            </label>
            <input
              type="email"
              id="admin-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              placeholder="admin@aerobook.com"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="admin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              className="relative float-right -mt-8 mr-3 text-gray-500 hover:text-gray-800"
            >
              {showPassword ? '◉' : '◌'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            {loading ? 'Signing in...' : 'Admin Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm text-indigo-600 hover:underline bg-transparent border-0 cursor-pointer"
          >
            Back to user login
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => navigate('/reset-password?account_type=admin')}
            className="text-sm text-gray-600 hover:text-gray-800 hover:underline bg-transparent border-0 cursor-pointer"
          >
            Forgot password?
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;
