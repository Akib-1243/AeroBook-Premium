<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('maintenance_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('aircraft_id')->constrained('aircraft')->cascadeOnDelete();
            $table->date('date');
            $table->text('description');
            $table->string('status', 30)->default('open');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_logs');
    }
};
