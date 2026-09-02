SELECT
    b.id AS booking_id,
    b.status AS booking_status,
    b.timestamp AS booking_date,
    f.id AS flight_id,
    f.origin,
    f.destination,
    f.departure,
    f.arrival,
    f.status AS flight_status,
    ac.model AS aircraft_model,
    s.seat_number,
    s.seat_class,
    pmt.amount AS payment_amount,
    pmt.status AS payment_status,
    pmt.payment_date
FROM dbo.bookings b
INNER JOIN dbo.passengers pas ON pas.id = b.passenger_id
INNER JOIN dbo.flights f ON f.id = b.flight_id
INNER JOIN dbo.aircraft ac ON ac.id = f.aircraft_id
INNER JOIN dbo.seats s ON s.id = b.seat_id
LEFT JOIN dbo.payments pmt ON pmt.booking_id = b.id
WHERE pas.user_id = :user_id
ORDER BY b.timestamp DESC;
