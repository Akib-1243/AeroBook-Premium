<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Aircraft extends Model
{
    use HasFactory;

    protected $fillable = [
        'model',
        'capacity',
        'total_flight_hours',
        'maintenance_threshold',
    ];

    public function flights(): HasMany
    {
        return $this->hasMany(Flight::class);
    }

    public function maintenanceLogs(): HasMany
    {
        return $this->hasMany(MaintenanceLog::class);
    }
}
