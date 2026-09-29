<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'flight_id' => ['required', 'integer'],
            'traveler_id' => ['nullable', 'integer'],
        ]);
        $flightId = (int) $data['flight_id'];
        $user = $request->user();
        $now = now();

        $savedTraveler = null;
        if (! empty($data['traveler_id'])) {
            $savedTraveler = DB::table('saved_travelers')
                ->where('id', $data['traveler_id'])
                ->where('user_id', $user->id)
                ->first();

            if (! $savedTraveler) {
                return response()->json(['message' => 'Saved traveler not found.'], 404);
            }
        }

        $profile = $savedTraveler ?? DB::table('traveler_profiles')->where('user_id', $user->id)->first();

        try {
            $bookingId = DB::transaction(function () use ($flightId, $user, $now, $profile, $savedTraveler): int {
                if (empty(DB::select($this->sql('booking_flight_exists.sql'), ['flight_id' => $flightId]))) {
                    throw new \RuntimeException('This flight is no longer available.');
                }

                $passengerRows = DB::select($this->sql('booking_passenger.sql'), ['user_id' => $user->id]);
                if (empty($passengerRows)) {
                    $passengerRow = DB::selectOne($this->sql('booking_insert_passenger.sql'), [
                        'user_id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'passport' => 'AUTO-' . $user->id,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    $passengerId = $passengerRow->id;
                } else {
                    $passengerId = $passengerRows[0]->id;
                }

                $seat = DB::selectOne($this->sql('booking_available_seat.sql'), ['flight_id' => $flightId]);

                if (!$seat) {
                    throw new \RuntimeException('No seats are available on this flight.');
                }

                DB::statement($this->sql('booking_update_seat.sql'), [
                    'seat_id' => $seat->id,
                    'updated_at' => $now,
                ]);

                $booking = DB::selectOne($this->sql('booking_insert.sql'), [
                    'passenger_id' => $passengerId,
                    'flight_id' => $flightId,
                    'seat_id' => $seat->id,
                    'booking_timestamp' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $nameParts = preg_split('/\s+/', trim($user->name), 2) ?: [];
                DB::table('booking_traveler_snapshots')->insert([
                    'booking_id' => $booking->id,
                    'source_saved_traveler_id' => $savedTraveler?->id,
                    'title' => $profile->title ?? null,
                    'first_name' => $profile->first_name ?? ($nameParts[0] ?? 'Traveler'),
                    'last_name' => $profile->last_name ?? ($nameParts[1] ?? ''),
                    'date_of_birth' => $profile->date_of_birth ?? null,
                    'gender' => $profile->gender ?? null,
                    'nationality' => $profile->nationality ?? null,
                    'passport_number' => $profile->passport_number ?? null,
                    'passport_issuing_country' => $profile->passport_issuing_country ?? null,
                    'passport_issue_date' => $profile->passport_issue_date ?? null,
                    'passport_expiry_date' => $profile->passport_expiry_date ?? null,
                    'national_id' => $profile->national_id ?? null,
                    'visa_information' => $profile->visa_information ?? null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                return (int) $booking->id;
            });
        } catch (\RuntimeException $error) {
            return response()->json(['message' => $error->getMessage()], 409);
        }

        return response()->json([
            'message' => 'Flight booked successfully.',
            'booking_id' => $bookingId,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $bookings = DB::select($this->sql('booking_index.sql'), ['user_id' => $userId]);

        return response()->json([
            'data' => array_map(fn ($row) => $this->formatRow($row), $bookings),
        ]);
    }

    public function show(Request $request, int $bookingId): JsonResponse
    {
        $userId = $request->user()->id;

        $rows = DB::select($this->sql('booking_show.sql'), [
            'booking_id' => $bookingId,
            'user_id' => $userId,
        ]);

        if (empty($rows)) {
            return response()->json(['message' => 'Booking not found.'], 404);
        }

        return response()->json([
            'data' => $this->formatRow($rows[0]),
        ]);
    }

    private function formatRow(object $row): array
    {
        $traveler = DB::table('booking_traveler_snapshots')->where('booking_id', $row->booking_id)->first();

        return [
            'id'            => $row->booking_id,
            'status'        => $row->booking_status,
            'timestamp'     => $row->booking_date,
            'flight'        => [
                'id'           => $row->flight_id,
                'origin'       => $row->origin,
                'destination'  => $row->destination,
                'departure'    => $row->departure,
                'arrival'      => $row->arrival,
                'status'       => $row->flight_status,
                'aircraft'     => $row->aircraft_model,
            ],
            'seat'          => [
                'number'       => $row->seat_number,
                'class'        => $row->seat_class,
            ],
            'traveler'      => $traveler ? [
                'title' => $traveler->title,
                'first_name' => $traveler->first_name,
                'last_name' => $traveler->last_name,
                'passport_number' => $traveler->passport_number,
            ] : null,
            'payment'       => [
                'amount'       => $row->payment_amount,
                'status'       => $row->payment_status,
                'date'         => $row->payment_date,
            ],
        ];
    }

    private function sql(string $filename): string
    {
        return file_get_contents(database_path('sql/' . $filename));
    }
}
