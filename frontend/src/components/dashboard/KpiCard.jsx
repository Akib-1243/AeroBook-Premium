function KpiCard({ title, value, change, color }) {
  return (
    <div className="kpi-card" style={{ background: color }}>
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
      {change && <div className="kpi-change">{change}</div>}
    </div>
  );
}

export default KpiCard;