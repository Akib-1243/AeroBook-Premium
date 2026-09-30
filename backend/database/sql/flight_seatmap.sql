SELECT
    s.id,
    s.seat_number AS number,
    s.row_no AS [row],
    s.seat_letter AS letter,
    s.seat_class AS class,
    s.seat_type AS type,
    s.position,
    s.status,
    s.surcharge
FROM dbo.seats s
WHERE s.flight_id = :flight_id
ORDER BY s.row_no, s.seat_letter;
