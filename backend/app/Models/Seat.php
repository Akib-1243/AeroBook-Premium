<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Seat extends Model
{
    use HasFactory;

    protected $fillable = [
        'flight_id',
        'seat_number',
        'seat_class',
        'is_booked',
    ];

    protected function casts(): array
    {
        return [
            'is_booked' => 'boolean',
        ];
    }

    public function flight(): BelongsTo
    {
        return $this->belongsTo(Flight::class);
    }

    public function booking(): HasOne
    {
        return $this->hasOne(Booking::class);
    }
}
