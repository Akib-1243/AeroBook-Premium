<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Services\Payments\SandboxPaymentGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    public function store(Request $request, SandboxPaymentGateway $gateway): JsonResponse
    {
        $data = $request->validate([
            'flight_id' => ['required', 'integer'],
            'seat_ids' => ['sometimes', 'array', 'min:1', 'max:9'],
            'seat_ids.*' => ['integer', 'distinct'],
            // book: hold the seats and pay later; buy: pay now and get the ticket straight away.
            'mode' => ['sometimes', 'string', 'in:book,buy'],
            'traveler_id' => ['nullable', 'integer'],
            'payment_method_id' => ['nullable', 'integer', 'required_if:mode,buy'],
        ]);

        $buyNow = ($data['mode'] ?? 'book') === 'buy';
        $flightId = (int) $data['flight_id'];
        $seatIds = array_map('intval', $data['seat_ids'] ?? []);
        $user = $request->user();
        $now = now();

        $paymentMethod = null;
        if ($buyNow) {
            $paymentMethod = $this->findPaymentMethod($user->id, (int) $data['payment_method_id']);
            if (! $paymentMethod) {
                return response()->json(['message' => 'Choose a valid saved payment method.'], 422);
            }
        }

        $flight = DB::table('flights')->where('id', $flightId)->where('status', 'scheduled')->first(['base_fare', 'currency']);
        if (! $flight) {
            return response()->json(['message' => 'This flight is no longer available.'], 409);
        }
        if ($buyNow && $flight->currency !== 'USD') {
            return response()->json(['message' => 'Sandbox checkout currently supports USD only.'], 422);
        }

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
            $bookingIds = DB::transaction(function () use ($flightId, $seatIds, $user, $now, $buyNow, $flight, $profile, $savedTraveler, $paymentMethod, $gateway): array {
                Booking::releaseExpiredHolds();

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

                if ($seatIds) {
                    // Seats picked on the seat map: all of them must still be available, or none are booked.
                    $locked = DB::select($this->sql('booking_lock_selected_seats.sql'), [
                        'seat_ids' => implode(',', $seatIds),
                        'flight_id' => $flightId,
                    ]);

                    if (count($locked) !== count($seatIds)) {
                        throw new \RuntimeException('This seat was just taken. Please choose another seat.');
                    }

                    $lockedSeats = $locked;
                } else {
                    $seat = DB::selectOne($this->sql('booking_available_seat.sql'), ['flight_id' => $flightId]);

                    if (!$seat) {
                        throw new \RuntimeException('No seats are available on this flight.');
                    }

                    $lockedSeats = [$seat];
                }

                $bookingIds = [];
                foreach ($lockedSeats as $seat) {
                    DB::statement($this->sql('booking_update_seat.sql'), [
                        'status' => $buyNow ? 'sold' : 'booked',
                        'updated_at' => $now,
                        'seat_id' => (int) $seat->id,
                    ]);

                    $booking = DB::selectOne($this->sql('booking_insert.sql'), [
                        'passenger_id' => $passengerId,
                        'flight_id' => $flightId,
                        'seat_id' => (int) $seat->id,
                        'booking_timestamp' => $now,
                        'status' => $buyNow ? 'confirmed' : 'pending',
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    $bookingIds[] = (int) $booking->id;

                    $this->snapshotTraveler((int) $booking->id, $user, $profile, $savedTraveler, $now);

                    if ($buyNow) {
                        $this->chargeAndRecord($gateway, $paymentMethod, (int) $booking->id, (float) $flight->base_fare + (float) $seat->surcharge, $now);
                    }
                }

                return $bookingIds;
            });
        } catch (\RuntimeException $error) {
            return response()->json(['message' => $error->getMessage()], 409);
        }

        return response()->json([
            'message' => $buyNow
                ? 'Sandbox payment approved. Your ticket is confirmed; no real money was charged.'
                : 'Seat booked. Complete payment within ' . $this->holdLabel() . ' to keep it.',
            'mode' => $buyNow ? 'buy' : 'book',
            'booking_id' => $bookingIds[0],
            'booking_ids' => $bookingIds,
            'gateway' => 'sandbox',
        ], 201);
    }

    // Pay for a booking made with mode=book: the held seat becomes sold and the booking confirmed.
    public function pay(Request $request, int $bookingId, SandboxPaymentGateway $gateway): JsonResponse
    {
        $data = $request->validate([
            'payment_method_id' => ['required', 'integer'],
        ]);
        $userId = $request->user()->id;
        $now = now();

        $paymentMethod = $this->findPaymentMethod($userId, (int) $data['payment_method_id']);
        if (! $paymentMethod) {
            return response()->json(['message' => 'Choose a valid saved payment method.'], 422);
        }

        try {
            DB::transaction(function () use ($bookingId, $userId, $now, $paymentMethod, $gateway): void {
                Booking::releaseExpiredHolds();

                $booking = DB::selectOne($this->sql('booking_lock_pending.sql'), [
                    'booking_id' => $bookingId,
                    'user_id' => $userId,
                ]);

                if (!$booking) {
                    throw new \RuntimeException('This booking is not awaiting payment. Its hold may have expired.');
                }
                if ($booking->currency !== 'USD') {
                    throw new \RuntimeException('Sandbox checkout currently supports USD only.');
                }

                DB::statement($this->sql('booking_update_seat.sql'), [
                    'status' => 'sold',
                    'updated_at' => $now,
                    'seat_id' => (int) $booking->seat_id,
                ]);
                DB::statement($this->sql('booking_confirm.sql'), [
                    'updated_at' => $now,
                    'booking_id' => $bookingId,
                ]);
                $this->chargeAndRecord($gateway, $paymentMethod, $bookingId, (float) $booking->base_fare + (float) $booking->surcharge, $now);
            });
        } catch (\RuntimeException $error) {
            return response()->json(['message' => $error->getMessage()], 409);
        }

        return response()->json([
            'message' => 'Sandbox payment approved. Your ticket is confirmed; no real money was charged.',
            'booking_id' => $bookingId,
            'gateway' => 'sandbox',
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        Booking::releaseExpiredHolds();
        $bookings = DB::select($this->sql('booking_index.sql'), ['user_id' => $userId]);

        return response()->json([
            'data' => array_map(fn ($row) => $this->formatRow($row), $bookings),
        ]);
    }

    public function show(Request $request, int $bookingId): JsonResponse
    {
        $userId = $request->user()->id;

        Booking::releaseExpiredHolds();
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
            'hold_expires_at' => $row->booking_status === 'pending'
                ? Carbon::parse($row->booking_date)->addMinutes(Booking::holdMinutes())->toIso8601String()
                : null,
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
                'gateway'      => $row->payment_gateway ?? null,
                'reference'    => $row->payment_reference ?? null,
            ],
        ];
    }

    private function findPaymentMethod(int $userId, int $methodId): ?object
    {
        return DB::table('saved_payment_methods')
            ->where('id', $methodId)
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->first();
    }

    // Fare = flight base fare + seat surcharge. A declined charge throws, rolling the whole booking back.
    private function chargeAndRecord(SandboxPaymentGateway $gateway, object $paymentMethod, int $bookingId, float $amount, $now): void
    {
        $charge = $gateway->charge($paymentMethod, (int) round($amount * 100));
        if (! in_array($charge['status'], ['completed', 'pending', 'success'], true)) {
            throw new \RuntimeException($charge['message'] ?? 'This payment method could not be processed.');
        }

        DB::statement($this->sql('payment_insert.sql'), [
            'booking_id' => $bookingId,
            'amount' => number_format($charge['amount_minor'] / 100, 2, '.', ''),
            'payment_date' => $now,
            'status' => $charge['status'],
            'gateway' => 'sandbox',
            'transaction_reference' => $charge['reference'],
            'payment_method_id' => $paymentMethod->id,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function snapshotTraveler(int $bookingId, object $user, ?object $profile, ?object $savedTraveler, $now): void
    {
        $nameParts = preg_split('/\s+/', trim($user->name), 2) ?: [];
        DB::table('booking_traveler_snapshots')->insert([
            'booking_id' => $bookingId,
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
    }

    private function holdLabel(): string
    {
        $minutes = Booking::holdMinutes();

        return $minutes % 60 === 0
            ? ($minutes / 60) . ' ' . ($minutes === 60 ? 'hour' : 'hours')
            : $minutes . ' minutes';
    }

    private function sql(string $filename): string
    {
        return file_get_contents(database_path('sql/' . $filename));
    }
}
