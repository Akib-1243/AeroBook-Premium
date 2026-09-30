import { useState } from 'react';
import SeatCell from './SeatCell';
import { SEAT_LEGEND, SEAT_MARK, buildCabinRows, displayStatus } from './seatMapUtils';

export function SeatLegend() {
  return (
    <div className="seat-legend" aria-label="Seat legend">
      <h3>Seat legend</h3>
      <ul>
        {SEAT_LEGEND.map(({ status, label, hint }) => (
          <li key={status}>
            <span className={`seat seat--${status} seat--sample`} aria-hidden="true">
              {SEAT_MARK[status]}
            </span>
            <strong>{label}</strong>
            <small>{hint}</small>
          </li>
        ))}
        <li>
          <span className="seat seat--available seat--xl seat--sample" aria-hidden="true" />
          <strong>Extra legroom</strong>
          <small>Purple border, surcharge shown on hover</small>
        </li>
        <li>
          <span className="seat-exit-label" aria-hidden="true">EXIT</span>
          <strong>Exit row</strong>
          <small>Adults only, must be able to help in an emergency</small>
        </li>
      </ul>
    </div>
  );
}

// Aircraft cabin drawn as a grid: rows top to bottom, an aisle between the two seat blocks.
export default function SeatMap({ seats, selectedIds, onToggle }) {
  const { letters, aisleAfter, rows } = buildCabinRows(seats);
  const [focus, setFocus] = useState({ row: 0, col: 0 });

  const moveFocus = (event) => {
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const move = moves[event.key];
    const current = event.target.closest('[data-row]');
    if (!move || !current) return;

    event.preventDefault();
    const row = Math.min(Math.max(Number(current.dataset.row) + move[0], 0), rows.length - 1);
    const col = Math.min(Math.max(Number(current.dataset.col) + move[1], 0), letters.length - 1);
    const next = event.currentTarget.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (next) {
      setFocus({ row, col });
      next.focus();
    }
  };

  if (seats.length === 0) {
    return <p className="seat-map-empty">No seat plan is available for this flight yet.</p>;
  }

  return (
    <div className="seat-map" role="grid" aria-label="Aircraft seat map" onKeyDown={moveFocus}>
      <div className="seat-map__row seat-map__header" role="row">
        <span className="seat-map__exit" />
        {letters.map((letter) => (
          <span key={letter} className="seat-map__slot" role="columnheader">
            <span className="seat-map__letter">{letter}</span>
            {letter === aisleAfter && <span className="seat-map__aisle" />}
          </span>
        ))}
        <span className="seat-map__exit" />
      </div>

      {rows.map((cabinRow, rowIndex) => (
        <div key={cabinRow.row} className="seat-map__row" role="row">
          <span className="seat-map__exit">{cabinRow.isExit && <span className="seat-exit-label">EXIT</span>}</span>
          {letters.map((letter, colIndex) => {
            const seat = cabinRow.seats[letter];
            return (
              <span key={letter} className="seat-map__slot" role="gridcell">
                {seat ? (
                  <SeatCell
                    seat={seat}
                    status={displayStatus(seat, selectedIds)}
                    onToggle={onToggle}
                    rowIndex={rowIndex}
                    colIndex={colIndex}
                    tabIndex={focus.row === rowIndex && focus.col === colIndex ? 0 : -1}
                  />
                ) : (
                  <span className="seat seat--none" aria-hidden="true" />
                )}
                {letter === aisleAfter && <span className="seat-map__aisle">{cabinRow.row}</span>}
              </span>
            );
          })}
          <span className="seat-map__exit">{cabinRow.isExit && <span className="seat-exit-label">EXIT</span>}</span>
        </div>
      ))}
    </div>
  );
}
