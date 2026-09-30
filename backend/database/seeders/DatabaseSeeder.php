<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\AirlineAccount;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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
        DB::table('airline_companies')->updateOrInsert(
            ['code' => 'PARTNER-AIR'],
            ['name' => 'Partner Air', 'updated_at' => $now, 'created_at' => $now]
        );
        $partnerCompanyId = (int) DB::table('airline_companies')->where('code', 'PARTNER-AIR')->value('id');
        AirlineAccount::firstOrCreate(
            ['email' => 'operator@partnerair.test'],
            [
                'airline_company_id' => $partnerCompanyId,
                'name' => 'Partner Air Operations',
                'password' => Hash::make('password'),
                'role' => 'airline_operator',
            ]
        );

        DB::table('aircraft')->upsert([
            [
                'model' => 'Boeing 737-800',
                'airline_company_id' => $partnerCompanyId,
                'capacity' => 180,
                'total_flight_hours' => 42500.5,
                'maintenance_threshold' => 50000,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'model' => 'Airbus A320neo',
                'airline_company_id' => $partnerCompanyId,
                'capacity' => 150,
                'total_flight_hours' => 31200.0,
                'maintenance_threshold' => 45000,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ], ['airline_company_id', 'model'], ['capacity', 'total_flight_hours', 'maintenance_threshold', 'updated_at']);

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
                        'airline_company_id' => $partnerCompanyId,
                        'aircraft_id' => $aircraftIds['Boeing 737-800'],
                        'departure' => $flightDeparture,
                        'arrival' => $flightDeparture->copy()->addHour(),
                        'status' => 'scheduled',
                        'base_fare' => 180.00 + ($routeNumber * 15),
                        'currency' => 'USD',
                        'updated_at' => $now,
                    ]);
                } else {
                    $flightId = DB::table('flights')->insertGetId([
                        'airline_company_id' => $partnerCompanyId,
                        'aircraft_id' => $aircraftIds['Boeing 737-800'],
                        'origin' => $origin,
                        'destination' => $destination,
                        'departure' => $flightDeparture,
                        'arrival' => $flightDeparture->copy()->addHour(),
                        'status' => 'scheduled',
                        'base_fare' => 180.00 + ($routeNumber * 15),
                        'currency' => 'USD',
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }

                $existingSeatNumbers = array_fill_keys(
                    array_map(
                        'strtoupper',
                        DB::table('seats')->where('flight_id', $flightId)->pluck('seat_number')->all()
                    ),
                    true
                );
                $missingSeats = array_values(array_filter(
                    $this->boeing737Layout($flightId, $now),
                    fn (array $seat): bool => ! isset($existingSeatNumbers[strtoupper($seat['seat_number'])])
                ));

                if ($missingSeats !== []) {
                    DB::table('seats')->insert($missingSeats);
                }

                $routeNumber++;
            }
        }

        // User::factory(10)->create();

        $demoUser = User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => bcrypt('password'),
            ]
        );

        $passenger = DB::table('passengers')->where('user_id', $demoUser->id)->first();
        if (! $passenger) {
            $passengerId = DB::table('passengers')->insertGetId([
                'user_id' => $demoUser->id,
                'name' => $demoUser->name,
                'email' => $demoUser->email,
                'passport' => 'DEMO-' . $demoUser->id,
                'frequent_flyer_points' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $passenger = DB::table('passengers')->where('id', $passengerId)->first();
        }

        DB::table('saved_payment_methods')->updateOrInsert(
            ['gateway_method_ref' => 'sandbox_pm_demo_visa_4242'],
            [
                'user_id' => $demoUser->id,
                'gateway' => 'sandbox',
                'gateway_customer_ref' => 'sandbox_customer_' . $demoUser->id,
                'brand' => 'Visa',
                'last_four' => '4242',
                'expiry_month' => 12,
                'expiry_year' => now()->year + 2,
                'is_default' => true,
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        DB::table('saved_payment_methods')->where('user_id', $demoUser->id)
            ->where('gateway_method_ref', '<>', 'sandbox_pm_demo_visa_4242')->update(['is_default' => false]);

        $demoFlight = DB::table('flights')->where('origin', 'Dhaka')->where('destination', 'Chittagong')->first();
        if ($demoFlight) {
            $demoBooking = DB::table('bookings')->where('passenger_id', $passenger->id)
                ->where('flight_id', $demoFlight->id)->first();

            if (! $demoBooking) {
                $demoSeat = DB::table('seats')->where('flight_id', $demoFlight->id)
                    ->where('is_booked', false)->orderBy('id')->first();

                if ($demoSeat) {
                    $demoBookingId = DB::table('bookings')->insertGetId([
                        'passenger_id' => $passenger->id,
                        'flight_id' => $demoFlight->id,
                        'seat_id' => $demoSeat->id,
                        'timestamp' => $now,
                        'status' => 'confirmed',
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    DB::table('seats')->where('id', $demoSeat->id)->update(['is_booked' => true, 'updated_at' => $now]);

                    $demoBooking = (object) ['id' => $demoBookingId];
                }
            }

            if ($demoBooking && ! DB::table('payments')->where('booking_id', $demoBooking->id)->exists()) {
                DB::table('payments')->insert([
                    'booking_id' => $demoBooking->id,
                    'amount' => $demoFlight->base_fare,
                    'payment_date' => $now,
                    'status' => 'completed',
                    'gateway' => 'sandbox',
                    'transaction_reference' => 'sbx_seed_txn_' . $demoBooking->id,
                    'payment_method_id' => DB::table('saved_payment_methods')
                        ->where('gateway_method_ref', 'sandbox_pm_demo_visa_4242')->value('id'),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
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
                        'extra_legroom' => 15,
                        'exit' => 8,
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
