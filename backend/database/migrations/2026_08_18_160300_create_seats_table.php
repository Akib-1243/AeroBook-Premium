<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('seats', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('flight_id')->constrained()->cascadeOnDelete();
            $table->string('seat_number', 10);
            $table->string('seat_class', 20);
            $table->boolean('is_booked')->default(false);
            $table->timestamps();

            $table->unique(['flight_id', 'seat_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seats');
    }
};
