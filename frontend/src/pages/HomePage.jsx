import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">✈️ AeroBook</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Welcome, {user?.name}!</h2>
            <p className="text-xl text-gray-600">Your account is all set and ready to book your next flight</p>
          </div>

          {/* User Info Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 mb-12 border border-blue-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Your Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Name</label>
                <p className="text-lg text-gray-900 font-semibold">{user?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Email</label>
                <p className="text-lg text-gray-900 font-semibold">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Passport Number</label>
                <p className="text-lg text-gray-900 font-semibold">
                  {user?.passport ?? user?.passenger?.passport ?? 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Member Since</label>
                <p className="text-lg text-gray-900 font-semibold">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}
                </p>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Search Flights */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-8 text-white shadow-lg hover:shadow-xl transition">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold mb-2">Search Flights</h3>
              <p className="mb-6 opacity-90">Find and book the perfect flight for your journey</p>
              <button className="bg-white text-blue-600 font-semibold px-6 py-2 rounded-lg hover:bg-blue-50 transition">
                Search Now
              </button>
            </div>

            {/* My Bookings */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-8 text-white shadow-lg hover:shadow-xl transition">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-2xl font-bold mb-2">My Bookings</h3>
              <p className="mb-6 opacity-90">View and manage all your flight bookings</p>
              <button className="bg-white text-purple-600 font-semibold px-6 py-2 rounded-lg hover:bg-purple-50 transition">
                View Bookings
              </button>
            </div>

            {/* Rewards */}
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-8 text-white shadow-lg hover:shadow-xl transition">
              <div className="text-4xl mb-4">⭐</div>
              <h3 className="text-2xl font-bold mb-2">Rewards</h3>
              <p className="mb-6 opacity-90">Earn and redeem loyalty points on every booking</p>
              <button className="bg-white text-amber-600 font-semibold px-6 py-2 rounded-lg hover:bg-amber-50 transition">
                Check Rewards
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Your Activity</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">0</div>
                <p className="text-gray-600 text-sm">Flights Booked</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">0</div>
                <p className="text-gray-600 text-sm">Trips Completed</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600">0</div>
                <p className="text-gray-600 text-sm">Reward Points</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">0</div>
                <p className="text-gray-600 text-sm">Miles Traveled</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p>&copy; 2024 AeroBook. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
