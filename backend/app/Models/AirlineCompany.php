<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'code'])]
class AirlineCompany extends Model
{
    public function accounts(): HasMany
    {
        return $this->hasMany(AirlineAccount::class, 'airline_company_id');
    }

    public function flights(): HasMany
    {
        return $this->hasMany(Flight::class, 'airline_company_id');
    }
}
