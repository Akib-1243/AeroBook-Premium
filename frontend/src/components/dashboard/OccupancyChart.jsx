function OccupancyChart({ occupied, empty }) {
  const total = occupied + empty || 1;
  const occupiedPct = (occupied / total) * 100;

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const occupiedLength = (occupiedPct / 100) * circumference;

  return (
    <div className="chart-card">
      <h3 className="chart-title">Seat Occupancy</h3>
      <div className="donut-wrap">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle className="occupancy-track" cx="80" cy="80" r={radius} fill="none" strokeWidth="18" />
          <circle
            className="occupancy-value"
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            strokeWidth="18"
            strokeDasharray={`${occupiedLength} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 80 80)"
          />
          <text x="80" y="86" textAnchor="middle" fontSize="22" fontWeight="700">
            {Math.round(occupiedPct)}%
          </text>
        </svg>
        <div className="donut-legend">
          <div><span className="dot dot-occupied" /> Occupied ({occupied})</div>
          <div><span className="dot dot-empty" /> Empty ({empty})</div>
        </div>
      </div>
    </div>
  );
}

export default OccupancyChart;