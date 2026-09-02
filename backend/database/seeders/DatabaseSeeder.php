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
                    $seats = [];
                    foreach (range(1, 6) as $seatNumber) {
                        $seats[] = [
                            'flight_id' => $flightId,
                            'seat_number' => $seatNumber . 'A',
                            'seat_class' => $seatNumber <= 2 ? 'business' : 'economy',
                            'is_booked' => false,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                    }
                    DB::table('seats')->insert($seats);
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
}
