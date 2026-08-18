# AeroBook Backend API

Laravel REST API backend for AeroBook with token-based authentication (Sanctum), MySQL schema based on the provided ERD, and Docker runtime.

## Stack

- Laravel 13
- Laravel Sanctum (Bearer token auth)
- MySQL 8.4
- Docker Compose (app + nginx + mysql)

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

## Run With Docker

1. Build and start containers:

```bash
docker compose up -d --build
```

2. Generate app key (first run):

```bash
docker compose exec app php artisan key:generate
```

3. Run migrations:

```bash
docker compose exec app php artisan migrate
```

4. API is available at http://localhost:8000

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

4. Set MySQL credentials in .env, then run migrations:

```bash
php artisan migrate
```

5. Start server:

```bash
php artisan serve
```

## Notes

- In this environment, Docker CLI was not installed, so container startup and migrations could not be executed automatically.
- Composer was installed locally as ../composer.phar.
