<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'passenger_id',
        'flight_id',
        'seat_id',
        'timestamp',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'timestamp' => 'datetime',
        ];
    }

    public static function holdMinutes(): int
    {
        return max(1, (int) config('app.booking_hold_minutes', 1440));
    }

    // Unpaid bookings whose hold ran out: free the seat and mark the booking expired.
    public static function releaseExpiredHolds(): void
    {
        $now = now();
        $bindings = ['cutoff' => $now->copy()->subMinutes(self::holdMinutes()), 'updated_at' => $now];

        DB::statement(file_get_contents(database_path('sql/booking_release_expired_seats.sql')), $bindings);
        DB::statement(file_get_contents(database_path('sql/booking_expire_holds.sql')), $bindings);
    }

    public function passenger(): BelongsTo
    {
        return $this->belongsTo(Passenger::class);
    }

    public function flight(): BelongsTo
    {
        return $this->belongsTo(Flight::class);
    }

    public function seat(): BelongsTo
    {
        return $this->belongsTo(Seat::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
