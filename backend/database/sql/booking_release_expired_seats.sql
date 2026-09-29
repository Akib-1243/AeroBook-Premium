-- Put seats back on sale when their unpaid booking's hold has run out.
UPDATE s
SET s.status = 'available', s.is_booked = 0, s.updated_at = :updated_at
FROM dbo.seats s
INNER JOIN dbo.bookings b ON b.seat_id = s.id
WHERE b.status = 'pending'
  AND b.[timestamp] < :cutoff
  AND s.status = 'booked';
