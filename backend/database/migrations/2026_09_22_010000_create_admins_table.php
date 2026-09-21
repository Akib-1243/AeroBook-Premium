<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admins', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->string('role', 20)->default('admin');
            $table->timestamps();
        });

        $adminUsers = DB::table('users')->where('role', 'admin')->get();

        foreach ($adminUsers as $admin) {
            DB::table('admins')->insert([
                'name' => $admin->name,
                'email' => $admin->email,
                'email_verified_at' => $admin->email_verified_at,
                'password' => $admin->password,
                'role' => 'admin',
                'created_at' => $admin->created_at,
                'updated_at' => $admin->updated_at,
            ]);
        }

        DB::table('users')->where('role', 'admin')->delete();
    }

    public function down(): void
    {
        $admins = DB::table('admins')->get();

        foreach ($admins as $admin) {
            DB::table('users')->insert([
                'name' => $admin->name,
                'email' => $admin->email,
                'email_verified_at' => $admin->email_verified_at,
                'password' => $admin->password,
                'remember_token' => $admin->remember_token,
                'role' => 'admin',
                'created_at' => $admin->created_at,
                'updated_at' => $admin->updated_at,
            ]);
        }

        Schema::dropIfExists('admins');
    }
};
