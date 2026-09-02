UPDATE dbo.seats
SET is_booked = 1, updated_at = :updated_at
WHERE id = :seat_id;
