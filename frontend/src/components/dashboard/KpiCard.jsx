function KpiCard({ title, value, change, tone }) {
  return (
    <div className={`kpi-card kpi-card-${tone}`}>
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
      {change && <div className="kpi-change">{change}</div>}
    </div>
  );
}

export default KpiCard;