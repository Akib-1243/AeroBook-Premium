import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEAT_MARK,
  displayStatus,
  isClickable,
  toggleSeat,
  pruneSelection,
  buildCabinRows,
  seatAriaLabel,
  seatPriceLabel,
  selectionCounter,
  seatClassNames,
} from '../src/components/booking/seatMapUtils.js';

const seat = (overrides) => ({
  id: 1,
  number: '1A',
  row: 1,
  letter: 'A',
  status: 'available',
  type: 'standard',
  position: 'window',
  surcharge: 0,
  ...overrides,
});

test('displayStatus shows selected only for available seats the user picked', () => {
  assert.equal(displayStatus(seat({ id: 5 }), [5]), 'selected');
  assert.equal(displayStatus(seat({ id: 5 }), []), 'available');
  assert.equal(displayStatus(seat({ id: 5, status: 'sold' }), [5]), 'sold');
  assert.equal(displayStatus(seat({ status: 'booked' }), []), 'booked');
  assert.equal(displayStatus(seat({ status: 'blocked' }), []), 'blocked');
});

test('only available and selected seats are clickable', () => {
  assert.equal(isClickable('available'), true);
  assert.equal(isClickable('selected'), true);
  assert.equal(isClickable('booked'), false);
  assert.equal(isClickable('sold'), false);
  assert.equal(isClickable('blocked'), false);
});

test('every status has a symbol so colour is never the only signal', () => {
  assert.equal(SEAT_MARK.booked, 'B');
  assert.equal(SEAT_MARK.sold, 'X');
  assert.equal(SEAT_MARK.blocked, '-');
  assert.equal(SEAT_MARK.selected, '✓');
  assert.equal(SEAT_MARK.available, '');
});

test('toggleSeat selects, deselects and enforces the passenger limit', () => {
  let result = toggleSeat([], seat({ id: 1 }), 2);
  assert.deepEqual(result, { selected: [1], error: '' });

  result = toggleSeat([1], seat({ id: 2, number: '1B' }), 2);
  assert.deepEqual(result.selected, [1, 2]);

  result = toggleSeat([1, 2], seat({ id: 3, number: '1C' }), 2);
  assert.deepEqual(result.selected, [1, 2]);
  assert.match(result.error, /only select 2 seats/);

  result = toggleSeat([1, 2], seat({ id: 1 }), 2);
  assert.deepEqual(result, { selected: [2], error: '' });
});

test('toggleSeat refuses seats that are not available', () => {
  const result = toggleSeat([], seat({ id: 9, status: 'sold' }), 3);
  assert.deepEqual(result.selected, []);
  assert.match(result.error, /not available/);
});

test('pruneSelection drops seats someone else took and reports them', () => {
  const seats = [
    seat({ id: 1, number: '1A' }),
    seat({ id: 2, number: '1B', status: 'booked' }),
    seat({ id: 3, number: '1C', status: 'sold' }),
  ];
  const result = pruneSelection([1, 2, 3], seats);
  assert.deepEqual(result.selected, [1]);
  assert.deepEqual(result.lost, ['1B', '1C']);
});

test('pruneSelection keeps the same array when nothing changed', () => {
  const selected = [1];
  const result = pruneSelection(selected, [seat({ id: 1 })]);
  assert.equal(result.selected, selected);
  assert.deepEqual(result.lost, []);
});

test('buildCabinRows orders rows and letters and puts the aisle in the middle', () => {
  const seats = ['2B', '1A', '1B', '1C', '1D', '1E', '1F', '2A'].map((number, index) =>
    seat({ id: index + 1, number, row: Number(number[0]), letter: number[1] })
  );
  const cabin = buildCabinRows(seats);

  assert.deepEqual(cabin.letters, ['A', 'B', 'C', 'D', 'E', 'F']);
  assert.equal(cabin.aisleAfter, 'C');
  assert.deepEqual(cabin.rows.map((row) => row.row), [1, 2]);
  assert.equal(cabin.rows[1].seats.A.number, '2A');
  assert.equal(cabin.rows[1].seats.C, null);
});

test('buildCabinRows flags exit rows', () => {
  const cabin = buildCabinRows([seat({ row: 10, type: 'exit' }), seat({ id: 2, row: 11 })]);
  assert.equal(cabin.rows[0].isExit, true);
  assert.equal(cabin.rows[1].isExit, false);
});

test('seatAriaLabel reads number, status and position', () => {
  assert.equal(
    seatAriaLabel(seat({ number: '12A' }), 'available'),
    'Seat 12A, available, window'
  );
  assert.equal(
    seatAriaLabel(seat({ number: '14C', type: 'extra_legroom', position: 'aisle' }), 'sold'),
    'Seat 14C, sold, aisle, extra legroom'
  );
});

test('seatPriceLabel shows surcharge with currency or included', () => {
  assert.equal(seatPriceLabel(seat({ surcharge: 0 })), 'Included in your fare');
  assert.equal(seatPriceLabel(seat({ surcharge: 15 })), '+ USD 15');
  assert.equal(seatPriceLabel(seat({ surcharge: '8.50' })), '+ USD 8.5');
});

test('selectionCounter reports progress', () => {
  assert.equal(selectionCounter(2, 3), '2 of 3 seats selected');
  assert.equal(selectionCounter(1, 1), '1 of 1 seat selected');
});

test('seatClassNames combines status and seat type classes', () => {
  assert.equal(seatClassNames(seat(), 'available'), 'seat seat--available');
  assert.equal(
    seatClassNames(seat({ type: 'extra_legroom' }), 'selected'),
    'seat seat--selected seat--xl'
  );
  assert.equal(seatClassNames(seat({ type: 'exit' }), 'booked'), 'seat seat--booked seat--exit');
});
