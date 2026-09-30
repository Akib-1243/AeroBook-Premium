<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(file_get_contents(database_path('sql/aircraft_maintenance_trigger.sql')));
        DB::unprepared(file_get_contents(database_path('sql/admin_dashboard.sql')));
    }

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS dbo.trg_flights_completed_maintenance');
        DB::unprepared('DROP PROCEDURE IF EXISTS dbo.usp_admin_dashboard');
    }
};
