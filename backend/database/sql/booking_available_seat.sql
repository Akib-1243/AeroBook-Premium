SELECT TOP 1 id, surcharge
FROM dbo.seats WITH (UPDLOCK, ROWLOCK)
WHERE flight_id = :flight_id AND status = 'available'
ORDER BY row_no, seat_letter, id;
