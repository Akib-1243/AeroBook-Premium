import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KpiCard from '../../components/dashboard/KpiCard';
import RevenueChart from '../../components/dashboard/RevenueChart';
import OccupancyChart from '../../components/dashboard/OccupancyChart';
import { getAdminDashboard } from '../../api/analytics';
import '../../styles/AdminDashboard.css';

function AdminDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminDashboard()
      .then(setDashboard)
      .catch((requestError) => setError(requestError.message || 'Unable to load dashboard data.'));
  }, []);

  if (error) {
    return <div className="admin-dashboard"><p className="dashboard-error">{error}</p></div>;
  }

  if (!dashboard) {
    return <div className="admin-dashboard"><p className="dashboard-loading">Loading dashboard...</p></div>;
  }

  const occupancy = dashboard.occupancy || { occupied: 0, available: 0 };
  const revenue = dashboard.revenue || [];
  const recentBookings = dashboard.recent_bookings || [];

  return (
    <div className="admin-dashboard">
      <nav className="admin-navbar">
        <h1>✈️ AeroBook Admin</h1>
        <button onClick={() => navigate('/home')}>Exit Admin</button>
      </nav>

      <div className="admin-content">
        <h2>Dashboard Overview</h2>

        <div className="kpi-row">
          <KpiCard title="Total Flights" value={dashboard.total_flights} change="From live database" color="linear-gradient(135deg,#f97316,#f43f5e)" />
          <KpiCard title="Active Bookings" value={dashboard.active_bookings} change="Confirmed or pending" color="linear-gradient(135deg,#3b82f6,#2563eb)" />
          <KpiCard title="Revenue (This Month)" value={`$${Number(dashboard.monthly_revenue).toLocaleString()}`} change="Paid transactions" color="linear-gradient(135deg,#10b981,#059669)" />
          <KpiCard title="Fleet Aircraft" value={dashboard.fleet_aircraft} change={`${dashboard.maintenance_aircraft || 0} in maintenance`} color="linear-gradient(135deg,#7c3aed,#4c1d95)" />
        </div>

        <div className="chart-row">
          <RevenueChart data={revenue} />
          <OccupancyChart occupied={occupancy.occupied || 0} empty={occupancy.available || 0} />
        </div>

        <div className="table-card">
          <h3 className="chart-title">Recent Bookings</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Passenger</th>
                <th>Flight</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b.id}>
                  <td>BK-{b.id}</td>
                  <td>{b.passenger}</td>
                  <td>{b.flight}</td>
                  <td>
                    <span className={`status-badge ${b.status === 'confirmed' ? 'status-confirmed' : 'status-pending'}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;