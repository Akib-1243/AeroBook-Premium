UPDATE dbo.bookings
SET status = 'confirmed', updated_at = :updated_at
WHERE id = :booking_id;
