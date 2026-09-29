<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('flights', function (Blueprint $table): void {
            $table->decimal('base_fare', 10, 2)->default(125.00);
            $table->string('currency', 3)->default('USD');
        });

        Schema::table('payments', function (Blueprint $table): void {
            $table->string('gateway', 40)->default('sandbox');
            $table->string('transaction_reference', 180)->nullable()->unique();
            $table->unsignedBigInteger('payment_method_id')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            $table->dropIndex(['payment_method_id']);
            $table->dropUnique(['transaction_reference']);
            $table->dropColumn(['gateway', 'transaction_reference', 'payment_method_id']);
        });

        Schema::table('flights', function (Blueprint $table): void {
            $table->dropColumn(['base_fare', 'currency']);
        });
    }
};