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
