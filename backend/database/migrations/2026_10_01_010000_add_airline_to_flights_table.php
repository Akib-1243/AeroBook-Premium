<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('flights', function (Blueprint $table): void {
            $table->string('airline')->default('AeroBook Air');
        });

        $airlines = ['Air Astra Bangladesh', 'Novoair', 'US-Bangla Airlines'];
        foreach (DB::table('flights')->orderBy('id')->pluck('id') as $index => $flightId) {
            DB::table('flights')->where('id', $flightId)->update([
                'airline' => $airlines[$index % count($airlines)],
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('flights', function (Blueprint $table): void {
            $table->dropColumn('airline');
        });
    }
};