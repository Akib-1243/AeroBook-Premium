<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('passenger_id')->constrained()->restrictOnDelete();
            $table->foreignId('flight_id')->constrained()->restrictOnDelete();
            $table->foreignId('seat_id')->constrained()->restrictOnDelete();
            $table->dateTime('timestamp')->useCurrent();
            $table->string('status', 30)->default('confirmed');
            $table->timestamps();

            $table->index(['flight_id', 'seat_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
