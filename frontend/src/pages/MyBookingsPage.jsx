import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getMyBookings } from '../api/bookings';

function MyBookingsPage() {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await getMyBookings();
        setBookings(response.data || []);
      } catch (err) {
        setError(err?.message || 'Failed to load bookings.');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const base = 'px-3 py-1 rounded-full text-xs font-semibold';
    const styles = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-amber-100 text-amber-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
      completed: 'bg-blue-100 text-blue-800',
    };
    const cls = styles[status] || styles.pending;
    const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';
    return <span className={`${base} ${cls}`}>{label}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <span className="text-2xl font-bold text-navy-700">✈️ AeroBook</span>
            </div>

            <div className="flex items-center space-x-6">
              <button
                onClick={() => navigate('/home')}
                className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors"
              >
                Home
              </button>
              <button
                onClick={() => navigate('/my-bookings')}
                className="text-blue-600 font-medium text-sm"
              >
                My Bookings
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="text-gray-600 hover:text-purple-600 font-medium text-sm transition-colors"
                >
                  Admin Panel
                </button>
              )}
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="mt-2 text-gray-600">
            {bookings.length === 0
              ? 'You have no bookings yet.'
              : `You have ${bookings.length} booking${bookings.length === 1 ? '' : 's'}.`}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="ml-3 text-gray-600">Loading your bookings...</p>
          </div>
        )}

        {!loading && bookings.length > 0 && (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Booking #{booking.id}
                      </span>
                      <div className="mt-1 flex items-center gap-3">
                        {getStatusBadge(booking.status)}
                        {getStatusBadge(booking.payment?.status || 'pending')}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">Booking Date</span>
                      <p className="text-sm text-gray-700 mt-1">
                        {formatDate(booking.timestamp)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Flight route */}
                    <div className="md:col-span-5">
                      <div className="flex items-center">
                        <div className="text-center">
                          <p className="text-xl font-bold text-gray-900">
                            {booking.flight.origin}
                          </p>
                          <p className="text-xs text-gray-500">Origin</p>
                        </div>
                        <div className="flex-1 mx-3">
                          <div className="border-t-2 border-dashed border-gray-300"></div>
                          <div className="flex justify-center my-1">
                            <span className="text-xs text-gray-500">
                              {booking.flight.aircraft}
                            </span>
                          </div>
                          <div className="border-t-2 border-dashed border-gray-300"></div>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-gray-900">
                            {booking.flight.destination}
                          </p>
                          <p className="text-xs text-gray-500">Destination</p>
                        </div>
                      </div>
                    </div>

                    {/* Departure / Arrival */}
                    <div className="md:col-span-3 text-center">
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(booking.flight.departure)}
                      </p>
                      <p className="text-xs text-gray-500">Departure</p>
                    </div>

                    <div className="md:col-span-2 text-center">
                      <p className="text-sm font-medium text-gray-900">
                        {booking.seat.number} ({booking.seat.class})
                      </p>
                      <p className="text-xs text-gray-500">Seat</p>
                    </div>

                    {/* Price */}
                    <div className="md:col-span-2 text-center">
                      <p className="text-lg font-bold text-gray-900">
                        {booking.payment?.amount
                          ? `$${Number(booking.payment.amount).toFixed(2)}`
                          : '—'}
                      </p>
                      <p className="text-xs text-gray-500">Paid</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && bookings.length === 0 && !error && (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="text-6xl mb-4">✈️</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No bookings found
            </h3>
            <p className="text-gray-500 mb-6">
              You haven't booked any flights yet.
            </p>
            <button
              onClick={() => navigate('/home')}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              Search Flights
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default MyBookingsPage;
