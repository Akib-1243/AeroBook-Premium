<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('aircraft', function (Blueprint $table): void {
            $table->id();
            $table->string('model');
            $table->unsignedInteger('capacity');
            $table->float('total_flight_hours')->default(0);
            $table->float('maintenance_threshold')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aircraft');
    }
};
