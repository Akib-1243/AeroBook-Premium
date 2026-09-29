-- Lock one of the traveller's unpaid bookings so it can be paid exactly once.
SELECT b.id, b.seat_id, s.surcharge, f.base_fare, f.currency
FROM dbo.bookings b WITH (UPDLOCK, ROWLOCK)
INNER JOIN dbo.passengers pas ON pas.id = b.passenger_id
INNER JOIN dbo.seats s ON s.id = b.seat_id
INNER JOIN dbo.flights f ON f.id = b.flight_id
WHERE b.id = :booking_id
  AND pas.user_id = :user_id
  AND b.status = 'pending';
