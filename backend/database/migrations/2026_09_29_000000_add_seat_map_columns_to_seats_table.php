<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Seat map colour legend (Improvement Plan 3.2): live status + layout data per seat.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seats', function (Blueprint $table): void {
            $table->string('status', 20)->default('available');      // available | booked | sold | blocked
            $table->string('seat_type', 20)->default('standard');    // standard | extra_legroom | exit
            $table->string('position', 10)->nullable();              // window | middle | aisle
            $table->unsignedSmallInteger('row_no')->nullable();
            $table->string('seat_letter', 2)->nullable();
            $table->decimal('surcharge', 10, 2)->default(0);

            $table->index(['flight_id', 'status']);
        });

        // Existing rows: a booked seat is already paid for in the current flow, so it is 'sold'.
        DB::table('seats')->where('is_booked', true)->update(['status' => 'sold']);

        foreach (DB::table('seats')->select('id', 'seat_number')->get() as $seat) {
            if (preg_match('/^(\d+)([A-Z])$/', strtoupper($seat->seat_number), $parts)) {
                DB::table('seats')->where('id', $seat->id)->update([
                    'row_no' => (int) $parts[1],
                    'seat_letter' => $parts[2],
                    'position' => match ($parts[2]) {
                        'A', 'F' => 'window',
                        'C', 'D' => 'aisle',
                        default => 'middle',
                    },
                ]);
            }
        }

        if (DB::getDriverName() === 'sqlsrv') {
            DB::statement("ALTER TABLE dbo.seats ADD CONSTRAINT CK_seats_status
                CHECK (status IN ('available', 'booked', 'sold', 'blocked'))");
            DB::statement("ALTER TABLE dbo.seats ADD CONSTRAINT CK_seats_seat_type
                CHECK (seat_type IN ('standard', 'extra_legroom', 'exit'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlsrv') {
            DB::statement('ALTER TABLE dbo.seats DROP CONSTRAINT CK_seats_status');
            DB::statement('ALTER TABLE dbo.seats DROP CONSTRAINT CK_seats_seat_type');
        }

        Schema::table('seats', function (Blueprint $table): void {
            $table->dropIndex(['flight_id', 'status']);
            $table->dropColumn(['status', 'seat_type', 'position', 'row_no', 'seat_letter', 'surcharge']);
        });
    }
};
