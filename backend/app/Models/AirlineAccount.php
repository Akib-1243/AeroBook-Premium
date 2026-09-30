<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['airline_company_id', 'name', 'email', 'password', 'role'])]
#[Hidden(['password', 'remember_token'])]
class AirlineAccount extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'airline_accounts';

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'role' => 'string',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(AirlineCompany::class, 'airline_company_id');
    }
}
