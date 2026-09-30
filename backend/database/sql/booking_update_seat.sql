-- :status is 'booked' (held until paid) or 'sold' (paid and ticketed).
UPDATE dbo.seats
SET status = :status, is_booked = 1, updated_at = :updated_at
WHERE id = :seat_id;
