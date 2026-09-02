SELECT dashboard_json = (
    SELECT
        (SELECT COUNT(*) FROM dbo.flights) AS total_flights,
        (SELECT COUNT(*) FROM dbo.bookings
         WHERE status IN ('confirmed', 'pending')) AS active_bookings,
        (SELECT COALESCE(SUM(amount), 0)
         FROM dbo.payments
         WHERE status IN ('paid', 'completed')
           AND payment_date >= DATEFROMPARTS(YEAR(SYSDATETIME()), MONTH(SYSDATETIME()), 1)) AS monthly_revenue,
        (SELECT COUNT(*) FROM dbo.aircraft) AS fleet_aircraft,
        (SELECT COUNT(*) FROM dbo.maintenance_logs
         WHERE status IN ('scheduled', 'in_progress', 'pending')) AS maintenance_aircraft,
        JSON_QUERY((
            SELECT
                CAST(SUM(CASE WHEN s.is_booked = 1 THEN 1 ELSE 0 END) AS INT) AS occupied,
                CAST(SUM(CASE WHEN s.is_booked = 0 THEN 1 ELSE 0 END) AS INT) AS available,
                COUNT(*) AS total_seats
            FROM dbo.seats s
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        )) AS occupancy,
        JSON_QUERY((
            SELECT
                FORMAT(DATEADD(MONTH, DATEDIFF(MONTH, 0, p.payment_date), 0), 'MMM') AS label,
                COALESCE(SUM(p.amount), 0) AS value
            FROM dbo.payments p
            WHERE p.status IN ('paid', 'completed')
              AND p.payment_date >= DATEADD(MONTH, -5,
                  DATEFROMPARTS(YEAR(SYSDATETIME()), MONTH(SYSDATETIME()), 1))
            GROUP BY DATEADD(MONTH, DATEDIFF(MONTH, 0, p.payment_date), 0)
            ORDER BY DATEADD(MONTH, DATEDIFF(MONTH, 0, p.payment_date), 0)
            FOR JSON PATH
        )) AS revenue,
        JSON_QUERY((
            SELECT TOP 5
                b.id AS id,
                pas.name AS passenger,
                CONCAT(f.origin, ' - ', f.destination) AS flight,
                b.status AS status,
                b.timestamp AS booking_date
            FROM dbo.bookings b
            INNER JOIN dbo.passengers pas ON pas.id = b.passenger_id
            INNER JOIN dbo.flights f ON f.id = b.flight_id
            ORDER BY b.timestamp DESC
            FOR JSON PATH
        )) AS recent_bookings
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
);
