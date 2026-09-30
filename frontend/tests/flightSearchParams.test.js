import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFlightSearchParams } from '../src/api/flights.js';

test('buildFlightSearchParams omits undefined values and defaults passengers', () => {
  const params = buildFlightSearchParams({
    origin: 'New York',
    destination: 'London',
    date: '2026-10-01',
    time: undefined,
    passengers: undefined,
  });

  assert.equal(params.get('origin'), 'New York');
  assert.equal(params.get('destination'), 'London');
  assert.equal(params.get('date'), '2026-10-01');
  assert.equal(params.get('passengers'), '1');
  assert.equal(params.has('time'), false);
});

test('buildFlightSearchParams serializes backend filter selections', () => {
  const params = buildFlightSearchParams({
    origin: 'Dhaka',
    destination: "Cox's Bazar",
    date: '2026-10-02',
    passengers: 2,
    filters: {
      stops: '0',
      airlines: ['Novoair', 'US-Bangla Airlines'],
      minPrice: 180,
      maxPrice: 420,
      departurePeriods: ['morning', 'afternoon'],
      arrivalPeriods: ['afternoon'],
      sort: 'price_asc',
    },
  });

  assert.equal(params.get('stops'), '0');
  assert.deepEqual(params.getAll('airlines[]'), ['Novoair', 'US-Bangla Airlines']);
  assert.equal(params.get('min_price'), '180');
  assert.equal(params.get('max_price'), '420');
  assert.deepEqual(params.getAll('departure_periods[]'), ['morning', 'afternoon']);
  assert.deepEqual(params.getAll('arrival_periods[]'), ['afternoon']);
  assert.equal(params.get('sort'), 'price_asc');
});

test('buildFlightSearchParams omits the unrestricted stops selection', () => {
  const params = buildFlightSearchParams({ filters: { stops: 'all' } });

  assert.equal(params.has('stops'), false);
});
