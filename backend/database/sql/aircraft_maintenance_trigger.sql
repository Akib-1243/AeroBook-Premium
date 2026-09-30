CREATE OR ALTER TRIGGER dbo.trg_flights_completed_maintenance
ON dbo.flights
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @completed_flights TABLE (
        aircraft_id BIGINT PRIMARY KEY,
        flight_hours FLOAT NOT NULL
    );

    INSERT INTO @completed_flights (aircraft_id, flight_hours)
    SELECT
        inserted.aircraft_id,
        SUM(CONVERT(FLOAT, DATEDIFF(SECOND, inserted.departure, inserted.arrival)) / 3600.0)
    FROM inserted
    INNER JOIN deleted ON deleted.id = inserted.id
    WHERE inserted.status = 'completed'
      AND ISNULL(deleted.status, '') <> 'completed'
    GROUP BY inserted.aircraft_id;

    IF NOT EXISTS (SELECT 1 FROM @completed_flights)
        RETURN;

    DECLARE @updated_aircraft TABLE (
        aircraft_id BIGINT PRIMARY KEY,
        total_flight_hours FLOAT NOT NULL,
        maintenance_threshold FLOAT NOT NULL
    );

    UPDATE aircraft
    SET
        total_flight_hours = COALESCE(aircraft.total_flight_hours, 0) + completed_flights.flight_hours,
        updated_at = SYSDATETIME()
    OUTPUT inserted.id, inserted.total_flight_hours, inserted.maintenance_threshold
    INTO @updated_aircraft (aircraft_id, total_flight_hours, maintenance_threshold)
    FROM dbo.aircraft AS aircraft
    INNER JOIN @completed_flights AS completed_flights
        ON completed_flights.aircraft_id = aircraft.id;

    INSERT INTO dbo.maintenance_logs
        (aircraft_id, [date], description, status, created_at, updated_at)
    SELECT
        updated_aircraft.aircraft_id,
        CAST(SYSDATETIME() AS DATE),
        CONCAT(
            'Automated maintenance scheduled at ',
            CONVERT(VARCHAR(30), updated_aircraft.total_flight_hours),
            ' flight hours (threshold ',
            CONVERT(VARCHAR(30), updated_aircraft.maintenance_threshold),
            ').'
        ),
        'scheduled',
        SYSDATETIME(),
        SYSDATETIME()
    FROM @updated_aircraft AS updated_aircraft
    WHERE updated_aircraft.total_flight_hours >= updated_aircraft.maintenance_threshold
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.maintenance_logs AS existing WITH (UPDLOCK, HOLDLOCK)
          WHERE existing.aircraft_id = updated_aircraft.aircraft_id
            AND existing.status IN ('open', 'pending', 'scheduled', 'in_progress')
      );
END;
