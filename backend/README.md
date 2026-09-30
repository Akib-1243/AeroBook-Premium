# AeroBook Backend API

Laravel REST API backend for AeroBook with token-based authentication (Sanctum), a Microsoft SQL Server database, and Docker runtime.

## Stack

- Laravel 13
- Laravel Sanctum (Bearer token auth)
- Microsoft SQL Server 2022 Developer
- Docker Compose (app + nginx + SQL Server)

## API Endpoints

Base URL: http://localhost:8000/api

- POST /auth/register
- POST /auth/login
- POST /auth/logout (requires Authorization: Bearer <token>)
- GET /auth/me (requires Authorization: Bearer <token>)

### Register Payload

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "passport": "A12345678",
  "password": "Str0ng!Pass",
  "password_confirmation": "Str0ng!Pass"
}
```

### Login Payload

```json
{
  "email": "jane@example.com",
  "password": "Str0ng!Pass"
}
```

## Security Notes

- Uses Eloquent ORM and query builder (parameterized queries) to prevent SQL injection.
- Request validation is enforced through FormRequest classes.
- Passwords are hashed using Laravel hashing.
- Token auth uses Laravel Sanctum personal access tokens.
- Login/register routes are rate-limited.

## Database Schema (ERD-aligned)

Tables created by migrations:

- users
- passengers
- aircraft
- flights
- seats
- bookings
- payments
- maintenance_logs
- personal_access_tokens

### SQL Server Maintenance and Analytics

- When a flight first changes to `completed`, `dbo.trg_flights_completed_maintenance` adds its departure-to-arrival duration to the assigned aircraft's `total_flight_hours`.
- When an aircraft reaches its `maintenance_threshold`, the trigger creates one scheduled maintenance log while no active maintenance log exists for that aircraft.
- The admin dashboard executes `dbo.usp_admin_dashboard`, which returns flight, booking, occupancy, revenue, and recent transaction data as JSON.

## Run With Docker

1. Build and start containers:

```bash
docker compose up -d --build --remove-orphans
```

2. Generate app key (first run):

```bash
docker compose exec app php artisan key:generate
```

3. Run migrations:

```bash
docker compose exec app php artisan migrate --force
```

4. API is available at http://localhost:8000

Password reset emails are captured in the local Mailpit inbox at http://localhost:8025.
This development inbox does not deliver messages to real Gmail accounts.

### Sandbox Transaction Gateway

The booking and saved-payment-method flows use an internal development sandbox. It creates opaque payment-method tokens and simulated receipts/refunds; it does not connect to a card network and never moves real money. Card numbers and security codes are discarded after tokenization and are not stored in AeroBook tables.

Seed the demo gateway account and sample transaction with:

```bash
docker compose exec app php artisan db:seed --force
```

Demo sign-in: `test@example.com` / `password`

Sandbox cards accepted by the tokenization form:

- `4242 4242 4242 4242` simulates approval.
- `4000 0000 0000 0002` simulates a decline.
- Use any future expiry and a 3-digit security code. Do not enter a real card.

Real payment processing requires integrating a PCI-compliant hosted/tokenized gateway and configuring its credentials/webhooks.

SQL Server is available to SSMS at `localhost,1433`:

- Authentication: SQL Server Authentication
- Login: `sa`
- Password: `AeroBook_SqlServer_2026!`
- Database: `aerobook`

## Local Non-Docker Run (optional)

1. Copy env:

```bash
cp .env.example .env
```

2. Install deps:

```bash
php ../composer.phar install
```

3. Generate key:

```bash
php artisan key:generate
```

4. Set SQL Server credentials in .env, then run migrations:

```bash
php artisan migrate
```

5. Start server:

```bash
php artisan serve
```

## Notes

- SSMS is the client used to inspect and query the SQL Server database; the Docker SQL Server container is the database engine.
- Composer was installed locally as ../composer.phar.
