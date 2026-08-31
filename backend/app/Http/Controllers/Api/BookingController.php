<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $bookings = DB::select(
            "SELECT
                b.id AS booking_id,
                b.status AS booking_status,
                b.timestamp AS booking_date,
                f.id AS flight_id,
                f.origin,
                f.destination,
                f.departure,
                f.arrival,
                f.status AS flight_status,
                ac.model AS aircraft_model,
                s.seat_number,
                s.seat_class,
                pmt.amount AS payment_amount,
                pmt.status AS payment_status,
                pmt.payment_date
            FROM dbo.bookings b
            INNER JOIN dbo.passengers pas ON pas.id = b.passenger_id
            INNER JOIN dbo.flights f ON f.id = b.flight_id
            INNER JOIN dbo.aircraft ac ON ac.id = f.aircraft_id
            INNER JOIN dbo.seats s ON s.id = b.seat_id
            LEFT JOIN dbo.payments pmt ON pmt.booking_id = b.id
            WHERE pas.user_id = :user_id
            ORDER BY b.timestamp DESC",
            ['user_id' => $userId]
        );

        return response()->json([
            'data' => array_map(fn ($row) => $this->formatRow($row), $bookings),
        ]);
    }

    public function show(Request $request, int $bookingId): JsonResponse
    {
        $userId = $request->user()->id;

        $rows = DB::select(
            "SELECT
                b.id AS booking_id,
                b.status AS booking_status,
                b.timestamp AS booking_date,
                f.id AS flight_id,
                f.origin,
                f.destination,
                f.departure,
                f.arrival,
                f.status AS flight_status,
                ac.model AS aircraft_model,
                s.seat_number,
                s.seat_class,
                pmt.amount AS payment_amount,
                pmt.status AS payment_status,
                pmt.payment_date
            FROM dbo.bookings b
            INNER JOIN dbo.passengers pas ON pas.id = b.passenger_id
            INNER JOIN dbo.flights f ON f.id = b.flight_id
            INNER JOIN dbo.aircraft ac ON ac.id = f.aircraft_id
            INNER JOIN dbo.seats s ON s.id = b.seat_id
            LEFT JOIN dbo.payments pmt ON pmt.booking_id = b.id
            WHERE b.id = :booking_id AND pas.user_id = :user_id",
            ['booking_id' => $bookingId, 'user_id' => $userId]
        );

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
}
