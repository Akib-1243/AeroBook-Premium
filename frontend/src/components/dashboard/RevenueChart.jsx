function RevenueChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="chart-card">
      <h3 className="chart-title">Revenue (Last 6 Months)</h3>
      <div className="bar-chart">
        {data.map((d) => (
          <div className="bar-col" key={d.label}>
            <div
              className="bar"
              style={{ height: `${(d.value / max) * 160}px` }}
              title={`$${d.value}`}
            />
            <span className="bar-label">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RevenueChart;