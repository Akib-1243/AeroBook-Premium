import { useNavigate } from 'react-router-dom';
import KpiCard from '../../components/dashboard/KpiCard';
import RevenueChart from '../../components/dashboard/RevenueChart';
import OccupancyChart from '../../components/dashboard/OccupancyChart';
import '../../styles/AdminDashboard.css';

const revenueData = [
  { label: 'Mar', value: 12000 },
  { label: 'Apr', value: 15500 },
  { label: 'May', value: 11000 },
  { label: 'Jun', value: 18200 },
  { label: 'Jul', value: 21000 },
  { label: 'Aug', value: 19500 },
];

const recentBookings = [
  { id: 'BK-1042', passenger: 'Sarah Khan', flight: 'AB-204', status: 'Confirmed' },
  { id: 'BK-1041', passenger: 'Tanvir Ahmed', flight: 'AB-118', status: 'Pending' },
  { id: 'BK-1040', passenger: 'Nadia Islam', flight: 'AB-330', status: 'Confirmed' },
  { id: 'BK-1039', passenger: 'Rafiq Hasan', flight: 'AB-204', status: 'Confirmed' },
];

function AdminDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="admin-dashboard">
      <nav className="admin-navbar">
        <h1>✈️ AeroBook Admin</h1>
        <button onClick={() => navigate('/home')}>Exit Admin</button>
      </nav>

      <div className="admin-content">
        <h2>Dashboard Overview</h2>

        <div className="kpi-row">
          <KpiCard title="Total Flights" value="128" change="+8 this week" color="linear-gradient(135deg,#f97316,#f43f5e)" />
          <KpiCard title="Active Bookings" value="452" change="+12% vs last week" color="linear-gradient(135deg,#3b82f6,#2563eb)" />
          <KpiCard title="Revenue (This Month)" value="$19,500" change="+7% vs last month" color="linear-gradient(135deg,#10b981,#059669)" />
          <KpiCard title="Fleet Aircraft" value="24" change="2 in maintenance" color="linear-gradient(135deg,#7c3aed,#4c1d95)" />
        </div>

        <div className="chart-row">
          <RevenueChart data={revenueData} />
          <OccupancyChart occupied={342} empty={110} />
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
                  <td>{b.id}</td>
                  <td>{b.passenger}</td>
                  <td>{b.flight}</td>
                  <td>
                    <span className={`status-badge ${b.status === 'Confirmed' ? 'status-confirmed' : 'status-pending'}`}>
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