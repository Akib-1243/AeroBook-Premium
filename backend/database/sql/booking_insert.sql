-- :status is 'pending' for a booking awaiting payment, 'confirmed' once paid.
INSERT INTO dbo.bookings
    (passenger_id, flight_id, seat_id, [timestamp], status, created_at, updated_at)
OUTPUT INSERTED.id
VALUES
    (:passenger_id, :flight_id, :seat_id, :booking_timestamp, :status, :created_at, :updated_at);
