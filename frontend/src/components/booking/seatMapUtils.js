// Seat-map rules (Improvement Plan, section 3.2). Kept free of JSX so node:test can run them.
//
// Server statuses:  available | booked (reserved, awaiting payment) | sold | blocked
// Client-only:      selected  (lives in React state until the booking is made)

export const SEAT_STATUSES = ['available', 'selected', 'booked', 'sold', 'blocked'];

export const SEAT_MARK = {
  available: '',
  selected: '✓',
  booked: 'B',
  sold: 'X',
  blocked: '-',
};

export const SEAT_LEGEND = [
  { status: 'available', label: 'Available', hint: 'Free to choose' },
  { status: 'selected', label: 'Selected', hint: 'Chosen by you (not yet paid)' },
  { status: 'booked', label: 'Booked', hint: 'Reserved by a traveller, awaiting payment' },
  { status: 'sold', label: 'Sold', hint: 'Paid and ticketed' },
  { status: 'blocked', label: 'Blocked', hint: 'Not for sale' },
];

export const SEAT_CURRENCY = 'USD';

export const displayStatus = (seat, selectedIds) =>
  seat.status === 'available' && selectedIds.includes(seat.id) ? 'selected' : seat.status;

export const isClickable = (status) => status === 'available' || status === 'selected';

export const toggleSeat = (selectedIds, seat, limit) => {
  if (selectedIds.includes(seat.id)) {
    return { selected: selectedIds.filter((id) => id !== seat.id), error: '' };
  }

  if (seat.status !== 'available') {
    return { selected: selectedIds, error: `Seat ${seat.number} is not available.` };
  }

  if (selectedIds.length >= limit) {
    return {
      selected: selectedIds,
      error: `You can only select ${limit} ${limit === 1 ? 'seat' : 'seats'}. Deselect one first.`,
    };
  }

  return { selected: [...selectedIds, seat.id], error: '' };
};

// After a live refresh, drop any selected seat that another traveller booked or bought meanwhile.
export const pruneSelection = (selectedIds, seats) => {
  const byId = new Map(seats.map((seat) => [seat.id, seat]));
  const lost = [];
  const kept = selectedIds.filter((id) => {
    const seat = byId.get(id);
    if (seat && seat.status === 'available') return true;
    lost.push(seat ? seat.number : String(id));
    return false;
  });

  return { selected: lost.length ? kept : selectedIds, lost };
};

export const buildCabinRows = (seats) => {
  const letters = [...new Set(seats.map((seat) => seat.letter))].sort();
  const rowMap = new Map();

  seats.forEach((seat) => {
    if (!rowMap.has(seat.row)) {
      rowMap.set(seat.row, Object.fromEntries(letters.map((letter) => [letter, null])));
    }
    rowMap.get(seat.row)[seat.letter] = seat;
  });

  const rows = [...rowMap.keys()]
    .sort((a, b) => a - b)
    .map((row) => {
      const rowSeats = rowMap.get(row);
      return {
        row,
        seats: rowSeats,
        isExit: Object.values(rowSeats).some((seat) => seat?.type === 'exit'),
      };
    });

  return {
    letters,
    aisleAfter: letters[Math.ceil(letters.length / 2) - 1] ?? null,
    rows,
  };
};

const TYPE_LABEL = { extra_legroom: 'extra legroom', exit: 'exit row' };

export const seatAriaLabel = (seat, status) =>
  [`Seat ${seat.number}`, status, seat.position, TYPE_LABEL[seat.type]].filter(Boolean).join(', ');

export const seatPriceLabel = (seat) => {
  const surcharge = Number(seat.surcharge) || 0;
  if (surcharge <= 0) return 'Included in your fare';
  return `+ ${SEAT_CURRENCY} ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(surcharge)}`;
};

export const selectionCounter = (count, limit) =>
  `${count} of ${limit} ${limit === 1 ? 'seat' : 'seats'} selected`;

export const seatClassNames = (seat, status) =>
  [
    'seat',
    `seat--${status}`,
    seat.type === 'extra_legroom' && 'seat--xl',
    seat.type === 'exit' && 'seat--exit',
  ]
    .filter(Boolean)
    .join(' ');
