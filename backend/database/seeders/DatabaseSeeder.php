<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        DB::table('airports')->upsert([
            ['code' => 'DAC', 'city' => 'Dhaka', 'country' => 'Bangladesh'],
            ['code' => 'CGP', 'city' => 'Chittagong', 'country' => 'Bangladesh'],
            ['code' => 'ZYL', 'city' => 'Sylhet', 'country' => 'Bangladesh'],
            ['code' => 'RJH', 'city' => 'Rajshahi', 'country' => 'Bangladesh'],
        ], ['code'], ['city', 'country']);

        $now = Carbon::now();
        DB::table('aircraft')->upsert([
            [
                'model' => 'Boeing 737-800',
                'capacity' => 180,
                'total_flight_hours' => 42500.5,
                'maintenance_threshold' => 50000,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'model' => 'Airbus A320neo',
                'capacity' => 150,
                'total_flight_hours' => 31200.0,
                'maintenance_threshold' => 45000,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ], ['model'], ['capacity', 'total_flight_hours', 'maintenance_threshold', 'updated_at']);

        $cities = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi'];
        $aircraftIds = DB::table('aircraft')->pluck('id', 'model');
        $departure = Carbon::now('Asia/Dhaka')->addDay()->setTime(8, 0);
        $routeNumber = 0;

        foreach ($cities as $origin) {
            foreach ($cities as $destination) {
                if ($origin === $destination) {
                    continue;
                }

                $flightDeparture = $departure->copy()->addMinutes($routeNumber * 30);
                $flight = DB::table('flights')->where([
                    'origin' => $origin,
                    'destination' => $destination,
                ])->first();

                if ($flight) {
                    $flightId = $flight->id;
                    DB::table('flights')->where('id', $flightId)->update([
                        'aircraft_id' => $aircraftIds['Boeing 737-800'],
                        'departure' => $flightDeparture,
                        'arrival' => $flightDeparture->copy()->addHour(),
                        'status' => 'scheduled',
                        'updated_at' => $now,
                    ]);
                } else {
                    $flightId = DB::table('flights')->insertGetId([
                        'aircraft_id' => $aircraftIds['Boeing 737-800'],
                        'origin' => $origin,
                        'destination' => $destination,
                        'departure' => $flightDeparture,
                        'arrival' => $flightDeparture->copy()->addHour(),
                        'status' => 'scheduled',
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }

                if (!DB::table('seats')->where('flight_id', $flightId)->exists()) {
                    DB::table('seats')->insert($this->boeing737Layout($flightId, $now));
                }

                $routeNumber++;
            }
        }

        // User::factory(10)->create();

        User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => bcrypt('password'),
            ]
        );
    }

    /**
     * A 3-3 cabin (A B C | D E F), 20 rows: rows 1-2 business, row 3 extra legroom,
     * rows 12-13 over-wing exits, and two seats blocked for crew rest.
     */
    private function boeing737Layout(int $flightId, Carbon $now): array
    {
        $seats = [];

        foreach (range(1, 20) as $row) {
            foreach (['A', 'B', 'C', 'D', 'E', 'F'] as $letter) {
                $type = match (true) {
                    $row === 3 => 'extra_legroom',
                    in_array($row, [12, 13], true) => 'exit',
                    default => 'standard',
                };

                $seats[] = [
                    'flight_id' => $flightId,
                    'seat_number' => $row . $letter,
                    'seat_class' => $row <= 2 ? 'business' : 'economy',
                    'is_booked' => false,
                    'status' => $row === 20 && in_array($letter, ['C', 'D'], true) ? 'blocked' : 'available',
                    'seat_type' => $type,
                    'position' => match ($letter) {
                        'A', 'F' => 'window',
                        'C', 'D' => 'aisle',
                        default => 'middle',
                    },
                    'row_no' => $row,
                    'seat_letter' => $letter,
                    'surcharge' => match ($type) {
                        'extra_legroom' => 1500,
                        'exit' => 800,
                        default => 0,
                    },
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        return $seats;
    }
}
