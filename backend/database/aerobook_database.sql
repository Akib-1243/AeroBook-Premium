-- =============================================================================
-- AeroBook Premium - Complete Database Setup (Raw SQL)
-- =============================================================================
-- This file replaces ALL Laravel migrations. It creates the complete database
-- schema and seed data using raw SQL, suitable for SQL Server.
--
-- Usage (from host):
--   sqlcmd -S localhost,1433 -U sa -P 'AeroBook_SqlServer_2026!' -d aerobook -i backend/database/aerobook_database.sql
-- Or via SSMS: open and execute in a new query window connected to 'aerobook'.
-- =============================================================================

-- =============================================================================
-- Laravel system tables
-- =============================================================================

-- users (auth + role-based)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE [dbo].[users] (
        [id]                  INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [name]                NVARCHAR(255)     NOT NULL,
        [email]               NVARCHAR(255)     NOT NULL UNIQUE,
        [email_verified_at]   DATETIMEOFFSET    NULL,
        [password]            NVARCHAR(255)     NOT NULL,
        [remember_token]      NVARCHAR(100)     NULL,
        [role]                NVARCHAR(20)      NOT NULL DEFAULT 'user',
        [created_at]          DATETIMEOFFSET    NULL,
        [updated_at]          DATETIMEOFFSET    NULL
    );
END
GO

-- password_reset_tokens
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'password_reset_tokens')
BEGIN
    CREATE TABLE [dbo].[password_reset_tokens] (
        [email]    NVARCHAR(255)  NOT NULL PRIMARY KEY,
        [token]    NVARCHAR(255)  NOT NULL,
        [created_at] DATETIMEOFFSET NULL
    );
END
GO

-- sessions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sessions')
BEGIN
    CREATE TABLE [dbo].[sessions] (
        [id]            NVARCHAR(255)    NOT NULL PRIMARY KEY,
        [user_id]       BIGINT           NULL,
        [ip_address]    NVARCHAR(45)     NULL,
        [user_agent]    NVARCHAR(MAX)    NULL,
        [payload]       NVARCHAR(MAX)    NOT NULL,
        [last_activity] INT              NOT NULL
    );
    CREATE NONCLUSTERED INDEX [IX_sessions_user_id] ON [dbo].[sessions] ([user_id]);
END
GO

-- personal_access_tokens (Sanctum)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'personal_access_tokens')
BEGIN
    CREATE TABLE [dbo].[personal_access_tokens] (
        [id]                  BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [tokenable_type]      NVARCHAR(255)        NOT NULL,
        [tokenable_id]        BIGINT               NOT NULL,
        [name]                NVARCHAR(255)        NOT NULL,
        [token]               NVARCHAR(64)         NOT NULL UNIQUE,
        [abilities]           NVARCHAR(MAX)        NULL,
        [last_used_at]        DATETIMEOFFSET       NULL,
        [expires_at]          DATETIMEOFFSET       NULL,
        [created_at]          DATETIMEOFFSET       NULL,
        [updated_at]          DATETIMEOFFSET       NULL
    );
    CREATE NONCLUSTERED INDEX [IX_personal_access_tokens_tokenable]
        ON [dbo].[personal_access_tokens] ([tokenable_type], [tokenable_id]);
END
GO

-- cache, cache_locks
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cache')
BEGIN
    CREATE TABLE [dbo].[cache] (
        [key]        NVARCHAR(255)    NOT NULL PRIMARY KEY,
        [value]      NVARCHAR(MAX)  NOT NULL,
        [expiration] BIGINT           NOT NULL
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cache_locks')
BEGIN
    CREATE TABLE [dbo].[cache_locks] (
        [key]        NVARCHAR(255)    NOT NULL PRIMARY KEY,
        [value]      NVARCHAR(MAX)  NOT NULL,
        [expiration] BIGINT           NOT NULL
    );
END
GO

-- jobs, job_batches, failed_jobs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'jobs')
BEGIN
    CREATE TABLE [dbo].[jobs] (
        [id]            BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [queue]         NVARCHAR(255)      NOT NULL,
        [payload]       NVARCHAR(MAX)      NOT NULL,
        [attempts]      TINYINT            NOT NULL DEFAULT 1,
        [reserved_at]   DATETIMEOFFSET    NULL,
        [created_at]    DATETIMEOFFSET    NULL,
        [available_at]  DATETIMEOFFSET    NULL
    );
    CREATE NONCLUSTERED INDEX [IX_jobs_queue] ON [dbo].[jobs] ([queue]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'job_batches')
BEGIN
    CREATE TABLE [dbo].[job_batches] (
        [id]            NVARCHAR(255)    NOT NULL PRIMARY KEY,
        [name]          NVARCHAR(255)    NOT NULL,
        [total_jobs]    INT              NOT NULL DEFAULT 0,
        [processed_jobs] INT             NOT NULL DEFAULT 0,
        [failed_jobs]   INT              NOT NULL DEFAULT 0,
        [failed_job_ids] NVARCHAR(MAX)  NOT NULL,
        [created_at]    DATETIMEOFFSET    NULL,
        [finished_at]   DATETIMEOFFSET    NULL
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'failed_jobs')
BEGIN
    CREATE TABLE [dbo].[failed_jobs] (
        [id]             BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [uuid]           NVARCHAR(255)      NOT NULL UNIQUE,
        [connection]     NVARCHAR(255)      NOT NULL,
        [queue]          NVARCHAR(255)      NOT NULL,
        [payload]        NVARCHAR(MAX)      NOT NULL,
        [exception]      NVARCHAR(MAX)      NOT NULL,
        [failed_at]      DATETIMEOFFSET     NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
END
GO

-- =============================================================================
-- AeroBook application tables
-- =============================================================================

-- passengers
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'passengers')
BEGIN
    CREATE TABLE [dbo].[passengers] (
        [id]                     INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [user_id]                INT               NULL,
        [name]                   NVARCHAR(255)     NOT NULL,
        [email]                  NVARCHAR(255)     NOT NULL UNIQUE,
        [passport]               NVARCHAR(50)      NOT NULL UNIQUE,
        [frequent_flyer_points]  INT               NOT NULL DEFAULT 0,
        [created_at]             DATETIMEOFFSET    NULL,
        [updated_at]             DATETIMEOFFSET    NULL,
        CONSTRAINT [FK_passengers_users]
            FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id])
            ON DELETE SET NULL
    );
END
GO

-- aircraft
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'aircraft')
BEGIN
    CREATE TABLE [dbo].[aircraft] (
        [id]                  INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [model]               NVARCHAR(255)     NOT NULL,
        [capacity]            INT               NOT NULL,
        [total_flight_hours]  FLOAT             NOT NULL DEFAULT 0,
        [maintenance_threshold] FLOAT           NOT NULL DEFAULT 0,
        [created_at]          DATETIMEOFFSET    NULL,
        [updated_at]          DATETIMEOFFSET    NULL
    );
END
GO

-- flights
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'flights')
BEGIN
    CREATE TABLE [dbo].[flights] (
        [id]          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [aircraft_id] INT               NOT NULL,
        [origin]      NVARCHAR(255)     NOT NULL,
        [destination] NVARCHAR(255)     NOT NULL,
        [departure]   DATETIMEOFFSET    NOT NULL,
        [arrival]     DATETIMEOFFSET    NOT NULL,
        [status]      NVARCHAR(30)      NOT NULL DEFAULT 'scheduled',
        [created_at]  DATETIMEOFFSET    NULL,
        [updated_at]  DATETIMEOFFSET    NULL,
        CONSTRAINT [FK_flights_aircraft]
            FOREIGN KEY ([aircraft_id]) REFERENCES [dbo].[aircraft] ([id])
    );
    CREATE NONCLUSTERED INDEX [IX_flights_aircraft_id] ON [dbo].[flights] ([aircraft_id]);
END
GO

-- seats
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'seats')
BEGIN
    CREATE TABLE [dbo].[seats] (
        [id]          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [flight_id]   INT               NOT NULL,
        [seat_number] NVARCHAR(10)      NOT NULL,
        [seat_class]  NVARCHAR(20)      NOT NULL,
        [is_booked]   BIT               NOT NULL DEFAULT 0,
        [created_at]  DATETIMEOFFSET    NULL,
        [updated_at]  DATETIMEOFFSET    NULL,
        CONSTRAINT [FK_seats_flights]
            FOREIGN KEY ([flight_id]) REFERENCES [dbo].[flights] ([id])
            ON DELETE CASCADE,
        CONSTRAINT [UQ_seats_flight_seat]
            UNIQUE ([flight_id], [seat_number])
    );
    CREATE NONCLUSTERED INDEX [IX_seats_flight_id] ON [dbo].[seats] ([flight_id]);
END
GO

-- bookings
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bookings')
BEGIN
    CREATE TABLE [dbo].[bookings] (
        [id]          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [passenger_id] INT              NOT NULL,
        [flight_id]   INT               NOT NULL,
        [seat_id]     INT               NOT NULL,
        [timestamp]   DATETIMEOFFSET    NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        [status]      NVARCHAR(30)      NOT NULL DEFAULT 'confirmed',
        [created_at]  DATETIMEOFFSET    NULL,
        [updated_at]  DATETIMEOFFSET    NULL,
        CONSTRAINT [FK_bookings_passengers]
            FOREIGN KEY ([passenger_id]) REFERENCES [dbo].[passengers] ([id]),
        CONSTRAINT [FK_bookings_flights]
            FOREIGN KEY ([flight_id]) REFERENCES [dbo].[flights] ([id]),
        CONSTRAINT [FK_bookings_seats]
            FOREIGN KEY ([seat_id]) REFERENCES [dbo].[seats] ([id])
    );
    CREATE NONCLUSTERED INDEX [IX_bookings_flight_seat] ON [dbo].[bookings] ([flight_id], [seat_id]);
END
GO

-- payments
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'payments')
BEGIN
    CREATE TABLE [dbo].[payments] (
        [id]          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [booking_id]  INT               NOT NULL,
        [amount]      DECIMAL(10,2)     NOT NULL,
        [payment_date] DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        [status]      NVARCHAR(30)      NOT NULL DEFAULT 'pending',
        [created_at]  DATETIMEOFFSET    NULL,
        [updated_at]  DATETIMEOFFSET    NULL,
        CONSTRAINT [FK_payments_bookings]
            FOREIGN KEY ([booking_id]) REFERENCES [dbo].[bookings] ([id])
            ON DELETE CASCADE
    );
END
GO

-- maintenance_logs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'maintenance_logs')
BEGIN
    CREATE TABLE [dbo].[maintenance_logs] (
        [id]          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [aircraft_id] INT               NOT NULL,
        [date]        DATE              NOT NULL,
        [description] NVARCHAR(MAX)     NOT NULL,
        [status]      NVARCHAR(30)      NOT NULL DEFAULT 'open',
        [created_at]  DATETIMEOFFSET    NULL,
        [updated_at]  DATETIMEOFFSET    NULL,
        CONSTRAINT [FK_maintenance_logs_aircraft]
            FOREIGN KEY ([aircraft_id]) REFERENCES [dbo].[aircraft] ([id])
            ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX [IX_maintenance_logs_aircraft_id]
        ON [dbo].[maintenance_logs] ([aircraft_id]);
END
GO

-- =============================================================================
-- SEED DATA — auth users
-- =============================================================================
-- Passwords:
--   admin@aerobook.test  → "password"
--   user@aerobook.test   → "password"
--   akib.cse.20230204118@aust.edu → "Lollollol.1243;"
-- (bcrypt cost 12 hashes)

IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@aerobook.test')
BEGIN
    INSERT INTO users (name, email, email_verified_at, password, role, created_at, updated_at)
    VALUES ('Admin User', 'admin@aerobook.test', SYSDATETIMEOFFSET(),
            '$2y$12$NYjDhKQAiNs5wAgoENyh7OynefozrTjJtU1TtP82J7v/EvyjBGSlK', 'admin',
            SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
GO

IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'user@aerobook.test')
BEGIN
    INSERT INTO users (name, email, email_verified_at, password, role, created_at, updated_at)
    VALUES ('Test User', 'user@aerobook.test', SYSDATETIMEOFFSET(),
            '$2y$12$NYjDhKQAiNs5wAgoENyh7OynefozrTjJtU1TtP82J7v/EvyjBGSlK', 'user',
            SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
GO

IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'akib.cse.20230204118@aust.edu')
BEGIN
    INSERT INTO users (name, email, email_verified_at, password, role, created_at, updated_at)
    VALUES ('Md Akib', 'akib.cse.20230204118@aust.edu', SYSDATETIMEOFFSET(),
            '$2y$12$szrmbf4U5g9XHEugYUmCnOPWrZT92HDtt3SWXChp3ihewr4QcoUQe', 'admin',
            SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
GO

-- passengers for the seed users
IF NOT EXISTS (SELECT 1 FROM passengers WHERE email = 'admin@aerobook.test')
BEGIN
    INSERT INTO passengers (user_id, name, email, passport, frequent_flyer_points, created_at, updated_at)
    SELECT id, name, email, 'ADM1234567', 5000, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    FROM users WHERE email = 'admin@aerobook.test';
END
GO

IF NOT EXISTS (SELECT 1 FROM passengers WHERE email = 'user@aerobook.test')
BEGIN
    INSERT INTO passengers (user_id, name, email, passport, frequent_flyer_points, created_at, updated_at)
    SELECT id, name, email, 'TST1234567', 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    FROM users WHERE email = 'user@aerobook.test';
END
GO

IF NOT EXISTS (SELECT 1 FROM passengers WHERE email = 'akib.cse.20230204118@aust.edu')
BEGIN
    INSERT INTO passengers (user_id, name, email, passport, frequent_flyer_points, created_at, updated_at)
    SELECT id, name, email, 'AUST30204118', 3200, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    FROM users WHERE email = 'akib.cse.20230204118@aust.edu';
END
GO

-- =============================================================================
-- SEED DATA — aircraft & flights (for testing the My Bookings page)
-- =============================================================================

IF NOT EXISTS (SELECT 1 FROM aircraft WHERE model = 'Boeing 737-800')
BEGIN
    INSERT INTO aircraft (model, capacity, total_flight_hours, maintenance_threshold, created_at, updated_at)
    VALUES ('Boeing 737-800', 180, 42500.5, 50000, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
GO

IF NOT EXISTS (SELECT 1 FROM aircraft WHERE model = 'Airbus A320neo')
BEGIN
    INSERT INTO aircraft (model, capacity, total_flight_hours, maintenance_threshold, created_at, updated_at)
    VALUES ('Airbus A320neo', 150, 31200.0, 45000, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
GO

-- Flight AB-101: Dhaka → Chittagong
IF NOT EXISTS (SELECT 1 FROM flights WHERE origin = 'Dhaka' AND destination = 'Chittagong')
BEGIN
    INSERT INTO flights (aircraft_id, origin, destination, departure, arrival, status, created_at, updated_at)
    VALUES (1, 'Dhaka', 'Chittagong',
            DATEADD(HOUR, 2, SYSDATETIMEOFFSET()),
            DATEADD(HOUR, 3, SYSDATETIMEOFFSET()),
            'scheduled', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
GO

-- Flight AB-204: Dhaka → Sylhet
IF NOT EXISTS (SELECT 1 FROM flights WHERE origin = 'Dhaka' AND destination = 'Sylhet')
BEGIN
    INSERT INTO flights (aircraft_id, origin, destination, departure, arrival, status, created_at, updated_at)
    VALUES (2, 'Dhaka', 'Sylhet',
            DATEADD(HOUR, 5, SYSDATETIMEOFFSET()),
            DATEADD(HOUR, 6, SYSDATETIMEOFFSET()),
            'scheduled', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
GO

-- Flight AB-330: Chittagong → Rajshahi
IF NOT EXISTS (SELECT 1 FROM flights WHERE origin = 'Chittagong' AND destination = 'Rajshahi')
BEGIN
    INSERT INTO flights (aircraft_id, origin, destination, departure, arrival, status, created_at, updated_at)
    VALUES (1, 'Chittagong', 'Rajshahi',
            DATEADD(HOUR, 8, SYSDATETIMEOFFSET()),
            DATEADD(HOUR, 10, SYSDATETIMEOFFSET()),
            'scheduled', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
GO

-- =============================================================================
-- SEED DATA — seats (for the flights above)
-- =============================================================================

-- Seats for flight AB-101 ( Dhaka → Chittagong)
IF NOT EXISTS (SELECT 1 FROM seats WHERE flight_id = 1 AND seat_number = '1A')
BEGIN
    INSERT INTO seats (flight_id, seat_number, seat_class, is_booked, created_at, updated_at)
    VALUES
        (1, '1A', 'business',    0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (1, '1B', 'business',    1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (1, '2A', 'business',    0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (1, '12A', 'economy',    0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (1, '12B', 'economy',    1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (1, '13C', 'economy',    0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
GO

-- Seats for flight AB-204 ( Dhaka → Sylhet)
IF NOT EXISTS (SELECT 1 FROM seats WHERE flight_id = 2 AND seat_number = '5A')
BEGIN
    INSERT INTO seats (flight_id, seat_number, seat_class, is_booked, created_at, updated_at)
    VALUES
        (2, '5A', 'business',    0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (2, '5B', 'business',    0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (2, '14A', 'economy',    0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (2, '14B', 'economy',    0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
        (2, '15C', 'economy',    1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
GO

-- =============================================================================
-- SEED DATA — bookings & payments (so My Bookings page has data)
-- =============================================================================

-- Booking #1: Admin user on flight AB-101, seat 1B (booked)
IF NOT EXISTS (SELECT 1 FROM bookings WHERE passenger_id = (SELECT id FROM passengers WHERE email = 'admin@aerobook.test') AND flight_id = 1)
BEGIN
    INSERT INTO bookings (passenger_id, flight_id, seat_id, status, timestamp, created_at, updated_at)
    VALUES (
        (SELECT id FROM passengers WHERE email = 'admin@aerobook.test'),
        1,
        (SELECT id FROM seats WHERE flight_id = 1 AND seat_number = '1B'),
        'confirmed',
        DATEADD(HOUR, -3, SYSDATETIMEOFFSET()),
        SYSDATETIMEOFFSET(),
        SYSDATETIMEOFFSET()
    );
END
GO

-- Booking #2: Test user on flight AB-204, seat 15C (booked)
IF NOT EXISTS (SELECT 1 FROM bookings WHERE passenger_id = (SELECT id FROM passengers WHERE email = 'user@aerobook.test') AND flight_id = 2)
BEGIN
    INSERT INTO bookings (passenger_id, flight_id, seat_id, status, timestamp, created_at, updated_at)
    VALUES (
        (SELECT id FROM passengers WHERE email = 'user@aerobook.test'),
        2,
        (SELECT id FROM seats WHERE flight_id = 2 AND seat_number = '15C'),
        'confirmed',
        DATEADD(HOUR, -5, SYSDATETIMEOFFSET()),
        SYSDATETIMEOFFSET(),
        SYSDATETIMEOFFSET()
    );
END
GO

-- Payments for the bookings
IF NOT EXISTS (SELECT 1 FROM payments WHERE booking_id = (SELECT id FROM bookings WHERE passenger_id = (SELECT id FROM passengers WHERE email = 'admin@aerobook.test') AND flight_id = 1))
BEGIN
    INSERT INTO payments (booking_id, amount, payment_date, status, created_at, updated_at)
    VALUES (
        (SELECT id FROM bookings WHERE passenger_id = (SELECT id FROM passengers WHERE email = 'admin@aerobook.test') AND flight_id = 1),
        250.00,
        DATEADD(HOUR, -2, SYSDATETIMEOFFSET()),
        'completed',
        SYSDATETIMEOFFSET(),
        SYSDATETIMEOFFSET()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM payments WHERE booking_id = (SELECT id FROM bookings WHERE passenger_id = (SELECT id FROM passengers WHERE email = 'user@aerobook.test') AND flight_id = 2))
BEGIN
    INSERT INTO payments (booking_id, amount, payment_date, status, created_at, updated_at)
    VALUES (
        (SELECT id FROM bookings WHERE passenger_id = (SELECT id FROM passengers WHERE email = 'user@aerobook.test') AND flight_id = 2),
        180.00,
        DATEADD(HOUR, -4, SYSDATETIMEOFFSET()),
        'completed',
        SYSDATETIMEOFFSET(),
        SYSDATETIMEOFFSET()
    );
END
GO
