SELECT TOP 1 id
FROM dbo.seats WITH (UPDLOCK, ROWLOCK)
WHERE flight_id = :flight_id AND is_booked = 0
ORDER BY id;
