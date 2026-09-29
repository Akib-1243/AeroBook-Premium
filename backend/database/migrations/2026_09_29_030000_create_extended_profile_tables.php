<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('traveler_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('title', 20)->nullable();
            $table->string('first_name');
            $table->string('last_name');
            $table->date('date_of_birth')->nullable();
            $table->string('gender', 30)->nullable();
            $table->string('nationality', 100)->nullable();
            $table->string('address')->nullable();
            $table->string('passport_number', 50)->nullable();
            $table->string('passport_issuing_country', 100)->nullable();
            $table->date('passport_issue_date')->nullable();
            $table->date('passport_expiry_date')->nullable();
            $table->string('national_id', 100)->nullable();
            $table->text('visa_information')->nullable();
            $table->timestamps();
        });

        Schema::create('saved_travelers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 20)->nullable();
            $table->string('first_name');
            $table->string('last_name');
            $table->date('date_of_birth')->nullable();
            $table->string('gender', 30)->nullable();
            $table->string('nationality', 100)->nullable();
            $table->string('passport_number', 50)->nullable();
            $table->string('passport_issuing_country', 100)->nullable();
            $table->date('passport_issue_date')->nullable();
            $table->date('passport_expiry_date')->nullable();
            $table->string('national_id', 100)->nullable();
            $table->text('visa_information')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'last_name', 'first_name']);
        });

        Schema::create('profile_preferences', function (Blueprint $table): void {
            $table->foreignId('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->boolean('email_notifications')->default(true);
            $table->boolean('sms_notifications')->default(false);
            $table->timestamps();
        });

        Schema::create('profile_verification_codes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20);
            $table->string('destination');
            $table->string('code_hash');
            $table->timestamp('expires_at');
            $table->timestamps();
            $table->index(['user_id', 'type']);
        });

        Schema::create('account_login_history', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('logged_in_at');
            $table->index(['user_id', 'logged_in_at']);
        });

        DB::table('users')->whereNotNull('email_verified_at')->update(['email_verified_at' => null]);
    }

    public function down(): void
    {
        Schema::dropIfExists('account_login_history');
        Schema::dropIfExists('profile_verification_codes');
        Schema::dropIfExists('profile_preferences');
        Schema::dropIfExists('saved_travelers');
        Schema::dropIfExists('traveler_profiles');
    }
};