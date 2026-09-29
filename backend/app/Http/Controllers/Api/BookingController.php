<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'flight_id' => ['required', 'integer'],
            'seat_ids' => ['sometimes', 'array', 'min:1', 'max:9'],
            'seat_ids.*' => ['integer', 'distinct'],
            // book: hold the seats and pay later; buy: pay now and get the ticket straight away.
            'mode' => ['sometimes', 'string', 'in:book,buy'],
        ]);

        $buyNow = $request->input('mode', 'book') === 'buy';
        $flightId = (int) $request->input('flight_id');
        $seatIds = array_map('intval', $request->input('seat_ids', []));
        $user = $request->user();
        $now = now();

        try {
            $bookingIds = DB::transaction(function () use ($flightId, $seatIds, $user, $now, $buyNow): array {
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

                    if ($buyNow) {
                        $this->recordPayment((int) $booking->id, (float) $seat->surcharge, $now);
                    }
                }

                return $bookingIds;
            });
        } catch (\RuntimeException $error) {
            return response()->json(['message' => $error->getMessage()], 409);
        }

        return response()->json([
            'message' => $buyNow
                ? 'Payment received. Your ticket is confirmed.'
                : 'Seat booked. Complete payment within ' . $this->holdLabel() . ' to keep it.',
            'mode' => $buyNow ? 'buy' : 'book',
            'booking_id' => $bookingIds[0],
            'booking_ids' => $bookingIds,
        ], 201);
    }

    // Pay for a booking made with mode=book: the held seat becomes sold and the booking confirmed.
    public function pay(Request $request, int $bookingId): JsonResponse
    {
        $userId = $request->user()->id;
        $now = now();

        try {
            DB::transaction(function () use ($bookingId, $userId, $now): void {
                Booking::releaseExpiredHolds();

                $booking = DB::selectOne($this->sql('booking_lock_pending.sql'), [
                    'booking_id' => $bookingId,
                    'user_id' => $userId,
                ]);

                if (!$booking) {
                    throw new \RuntimeException('This booking is not awaiting payment. Its hold may have expired.');
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
                $this->recordPayment($bookingId, (float) $booking->surcharge, $now);
            });
        } catch (\RuntimeException $error) {
            return response()->json(['message' => $error->getMessage()], 409);
        }

        return response()->json([
            'message' => 'Payment received. Your ticket is confirmed.',
            'booking_id' => $bookingId,
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
            'payment'       => [
                'amount'       => $row->payment_amount,
                'status'       => $row->payment_status,
                'date'         => $row->payment_date,
            ],
        ];
    }

    // Seat surcharge only: flights carry no base fare in this schema yet.
    private function recordPayment(int $bookingId, float $amount, $now): void
    {
        DB::statement($this->sql('payment_insert.sql'), [
            'booking_id' => $bookingId,
            'amount' => $amount,
            'payment_date' => $now,
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
