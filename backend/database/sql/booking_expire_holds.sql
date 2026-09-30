-- Runs after booking_release_expired_seats.sql: close the unpaid bookings whose hold ran out.
UPDATE dbo.bookings
SET status = 'expired', updated_at = :updated_at
WHERE status = 'pending'
  AND [timestamp] < :cutoff;
