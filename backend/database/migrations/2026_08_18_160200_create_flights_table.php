<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('flights', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('aircraft_id')->constrained('aircraft')->restrictOnDelete();
            $table->string('origin');
            $table->string('destination');
            $table->dateTime('departure');
            $table->dateTime('arrival');
            $table->string('status', 30)->default('scheduled');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('flights');
    }
};
