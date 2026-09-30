<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FlightController extends Controller
{
    public function search(Request $request)
    {
        $origin = $request->query('origin');
        $destination = $request->query('destination');
        $date = $request->query('date');
        $passengers = (int) $request->query('passengers', 1);
        $periods = ['early_morning', 'morning', 'afternoon', 'evening'];
        $filters = $request->validate([
            'stops' => ['nullable', Rule::in(['0', '1', '2+'])],
            'airlines' => ['sometimes', 'array'],
            'airlines.*' => ['string', 'max:80'],
            'min_price' => ['nullable', 'numeric', 'min:0'],
            'max_price' => ['nullable', 'numeric', 'min:0'],
            'departure_periods' => ['sometimes', 'array'],
            'departure_periods.*' => ['string', Rule::in($periods)],
            'arrival_periods' => ['sometimes', 'array'],
            'arrival_periods.*' => ['string', Rule::in($periods)],
            'sort' => ['nullable', Rule::in(['departure_asc', 'price_asc', 'price_desc'])],
        ]);

        if (isset($filters['min_price'], $filters['max_price'])
            && (float) $filters['max_price'] < (float) $filters['min_price']) {
            return response()->json([
                'message' => 'The maximum fare must be greater than or equal to the minimum fare.',
            ], 422);
        }

        $airlineOptions = DB::table('flights')
            ->select('airline')
            ->selectRaw('COUNT(*) AS flight_count')
            ->whereNotNull('airline')
            ->where('airline', '<>', '')
            ->groupBy('airline')
            ->orderBy('airline')
            ->get()
            ->map(fn ($airline) => [
                'name' => $airline->airline,
                'count' => (int) $airline->flight_count,
            ])
            ->values();

        if (isset($filters['stops']) && $filters['stops'] !== '0') {
            return response()->json([
                'data' => [],
                'meta' => ['airlines' => $airlineOptions],
            ]);
        }

        Booking::releaseExpiredHolds();

        $filterSql = '';
        $bindings = [
            'origin' => $origin,
            'destination' => $destination,
            'date' => $date,
            'passengers' => $passengers,
        ];

        if (isset($filters['min_price'])) {
            $filterSql .= ' AND f.base_fare >= :min_price';
            $bindings['min_price'] = $filters['min_price'];
        }

        if (isset($filters['max_price'])) {
            $filterSql .= ' AND f.base_fare <= :max_price';
            $bindings['max_price'] = $filters['max_price'];
        }

        if (! empty($filters['airlines'])) {
            $airlinePlaceholders = [];
            foreach (array_values(array_unique($filters['airlines'])) as $index => $airline) {
                $placeholder = 'airline_' . $index;
                $airlinePlaceholders[] = ':' . $placeholder;
                $bindings[$placeholder] = $airline;
            }
            $filterSql .= ' AND f.airline IN (' . implode(', ', $airlinePlaceholders) . ')';
        }

        $timeWindows = [
            'early_morning' => ['00:00:00', '04:59:59'],
            'morning' => ['05:00:00', '11:59:59'],
            'afternoon' => ['12:00:00', '17:59:59'],
            'evening' => ['18:00:00', '23:59:59'],
        ];

        foreach (['departure_periods' => 'departure', 'arrival_periods' => 'arrival'] as $filterKey => $column) {
            if (empty($filters[$filterKey])) {
                continue;
            }

            $conditions = [];
            foreach (array_values(array_unique($filters[$filterKey])) as $index => $period) {
                $startKey = $filterKey . '_start_' . $index;
                $endKey = $filterKey . '_end_' . $index;
                $conditions[] = "CAST(f.$column AS TIME) BETWEEN :$startKey AND :$endKey";
                [$bindings[$startKey], $bindings[$endKey]] = $timeWindows[$period];
            }

            $filterSql .= ' AND (' . implode(' OR ', $conditions) . ')';
        }

        $sort = $filters['sort'] ?? 'departure_asc';
        $orderBy = match ($sort) {
            'price_asc' => 'f.base_fare ASC, f.departure ASC',
            'price_desc' => 'f.base_fare DESC, f.departure ASC',
            default => 'f.departure ASC',
        };

        $flights = DB::select(
            "SELECT
                f.id AS flight_id,
                f.origin,
                f.destination,
                f.airline,
                f.departure,
                f.arrival,
                f.status AS flight_status,
                f.base_fare,
                f.currency,
                ac.model AS aircraft_model,
                ac.capacity,
                0 AS stops,
                COUNT(s.id) AS total_seats,
                SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) AS available_seats
            FROM dbo.flights f
            INNER JOIN dbo.aircraft ac ON ac.id = f.aircraft_id
            LEFT JOIN dbo.seats s ON s.flight_id = f.id
            WHERE f.origin = :origin
              AND f.destination = :destination
              AND CAST(f.departure AS DATE) = :date
              AND f.status = 'scheduled'
              $filterSql
            GROUP BY
                f.id,
                f.origin,
                f.destination,
                f.airline,
                f.departure,
                f.arrival,
                f.status,
                f.base_fare,
                f.currency,
                ac.model,
                ac.capacity
            HAVING SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) >= :passengers
            ORDER BY $orderBy",
            $bindings
        );

        return response()->json([
            'data' => $flights,
            'meta' => ['airlines' => $airlineOptions],
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

