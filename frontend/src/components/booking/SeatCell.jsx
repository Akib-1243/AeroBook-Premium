import {
  SEAT_MARK,
  isClickable,
  seatAriaLabel,
  seatClassNames,
  seatPriceLabel,
} from './seatMapUtils';

// One seat on the map; its status comes from GET /flights/{id}/seatmap.
export default function SeatCell({ seat, status, onToggle, tabIndex, rowIndex, colIndex }) {
  const clickable = isClickable(status);

  return (
    <button
      type="button"
      className={seatClassNames(seat, status)}
      aria-disabled={!clickable}
      aria-pressed={status === 'selected'}
      aria-label={seatAriaLabel(seat, status)}
      title={`${seat.number} · ${seat.position || ''} · ${seatPriceLabel(seat)}`}
      tabIndex={tabIndex}
      data-row={rowIndex}
      data-col={colIndex}
      onClick={() => clickable && onToggle(seat)}
    >
      {SEAT_MARK[status] ?? ''}
    </button>
  );
}
