<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('saved_payment_methods', function (Blueprint $table): void {
            $table->string('payment_method_type', 20)->default('card');
        });
    }

    public function down(): void
    {
        Schema::table('saved_payment_methods', function (Blueprint $table): void {
            $table->dropColumn('payment_method_type');
        });
    }
};