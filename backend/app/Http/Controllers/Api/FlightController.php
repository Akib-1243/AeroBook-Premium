<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FlightController extends Controller
{
    public function search(Request $request)
    {
        $origin = $request->query('origin');
        $destination = $request->query('destination');
        $date = $request->query('date');
        $passengers = (int) $request->query('passengers', 1);

        Booking::releaseExpiredHolds();

        $flights = DB::select(
            "SELECT
                f.id AS flight_id,
                f.origin,
                f.destination,
                f.departure,
                f.arrival,
                f.status AS flight_status,
                f.base_fare,
                f.currency,
                ac.model AS aircraft_model,
                ac.capacity,
                COUNT(s.id) AS total_seats,
                SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) AS available_seats
            FROM dbo.flights f
            INNER JOIN dbo.aircraft ac ON ac.id = f.aircraft_id
            LEFT JOIN dbo.seats s ON s.flight_id = f.id
            WHERE f.origin = :origin
              AND f.destination = :destination
              AND CAST(f.departure AS DATE) = :date
              AND f.status = 'scheduled'
            GROUP BY
                f.id,
                f.origin,
                f.destination,
                f.departure,
                f.arrival,
                f.status,
                f.base_fare,
                f.currency,
                ac.model,
                ac.capacity
            HAVING SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) >= :passengers
            ORDER BY f.departure ASC",
            [
                'origin' => $origin,
                'destination' => $destination,
                'date' => $date,
                'passengers' => $passengers,
            ]
        );

        return response()->json([
            'data' => $flights,
        ]);
    }

    // Seat map with live status per seat (colour legend, Improvement Plan 3.2).
    public function seatmap(int $flightId): JsonResponse
    {
        $flight = DB::selectOne(
            'SELECT f.id, f.origin, f.destination, f.departure, f.arrival, f.status,
                    f.base_fare, f.currency, ac.model AS aircraft_model
             FROM dbo.flights f
             INNER JOIN dbo.aircraft ac ON ac.id = f.aircraft_id
             WHERE f.id = :flight_id',
            ['flight_id' => $flightId]
        );

        if (! $flight) {
            return response()->json(['message' => 'Flight not found.'], 404);
        }

        Booking::releaseExpiredHolds();
        $seats = DB::select(
            file_get_contents(database_path('sql/flight_seatmap.sql')),
            ['flight_id' => $flightId]
        );

        return response()->json([
            'flight' => $flight,
            'seats' => array_map(fn ($seat) => [
                'id' => (int) $seat->id,
                'number' => $seat->number,
                'row' => (int) $seat->row,
                'letter' => $seat->letter,
                'class' => $seat->class,
                'type' => $seat->type,
                'position' => $seat->position,
                'status' => $seat->status,
                'surcharge' => (float) $seat->surcharge,
            ], $seats),
        ]);
    }
}

