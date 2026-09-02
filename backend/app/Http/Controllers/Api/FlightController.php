<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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

        $flights = DB::select(
            "SELECT
                f.id AS flight_id,
                f.origin,
                f.destination,
                f.departure,
                f.arrival,
                f.status AS flight_status,
                ac.model AS aircraft_model,
                ac.capacity,
                COUNT(s.id) AS total_seats,
                SUM(CASE WHEN s.is_booked = 0 THEN 1 ELSE 0 END) AS available_seats
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
                ac.model,
                ac.capacity
            HAVING SUM(CASE WHEN s.is_booked = 0 THEN 1 ELSE 0 END) >= :passengers
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
}

