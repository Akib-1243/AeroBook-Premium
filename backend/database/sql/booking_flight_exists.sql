SELECT id
FROM dbo.flights
WHERE id = :flight_id AND status = 'scheduled';
