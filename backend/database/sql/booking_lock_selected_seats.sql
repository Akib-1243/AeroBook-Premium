-- Lock the seats the traveller picked on the seat map. A concurrent request for the
-- same seat waits here; afterwards the seat is no longer 'available' and is not returned.
SELECT s.id, s.surcharge
FROM dbo.seats s WITH (UPDLOCK, ROWLOCK)
JOIN STRING_SPLIT(:seat_ids, ',') picked ON CAST(picked.value AS INT) = s.id
WHERE s.flight_id = :flight_id
  AND s.status = 'available'
ORDER BY s.id;
