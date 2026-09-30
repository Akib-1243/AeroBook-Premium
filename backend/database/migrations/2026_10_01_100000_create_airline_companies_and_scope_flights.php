<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('airline_companies', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('code', 40)->unique();
            $table->timestamps();
        });

        Schema::create('airline_accounts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('airline_company_id')->constrained('airline_companies')->cascadeOnDelete();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role', 30)->default('airline_operator');
            $table->timestamps();
        });

        Schema::table('flights', function (Blueprint $table): void {
            $table->foreignId('airline_company_id')->nullable()->constrained('airline_companies')->nullOnDelete();
        });

        $companyId = DB::table('airline_companies')->insertGetId([
            'name' => 'Partner Air',
            'code' => 'PARTNER-AIR',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('flights')->whereNull('airline_company_id')->update([
            'airline_company_id' => $companyId,
        ]);
    }

    public function down(): void
    {
        Schema::table('flights', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('airline_company_id');
        });

        Schema::dropIfExists('airline_accounts');
        Schema::dropIfExists('airline_companies');
    }
};
