<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AirlineFlightController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $companyId = (int) $request->user()->airline_company_id;
        $seatCounts = DB::table('seats')
            ->select('flight_id')
            ->selectRaw('COUNT(*) AS seat_count')
            ->selectRaw("SUM(CASE WHEN status IN ('booked', 'sold') THEN 1 ELSE 0 END) AS occupied_seats")
            ->groupBy('flight_id');

        $flights = DB::table('flights as f')
            ->join('aircraft as ac', 'ac.id', '=', 'f.aircraft_id')
            ->leftJoinSub($seatCounts, 'seat_counts', fn ($join) => $join->on('seat_counts.flight_id', '=', 'f.id'))
            ->where('f.airline_company_id', $companyId)
            ->orderBy('f.departure')
            ->get([
                'f.id', 'f.airline_company_id', 'f.aircraft_id', 'f.origin', 'f.destination', 'f.departure', 'f.arrival',
                'f.status', 'f.base_fare', 'f.currency', 'ac.model as aircraft_model', 'ac.capacity',
                'seat_counts.seat_count', 'seat_counts.occupied_seats',
            ]);

        return response()->json([
            'company' => $request->user()->company()->first(['id', 'name', 'code']),
            'flights' => $flights,
            'airports' => DB::table('airports')->orderBy('city')->get(['id', 'code', 'city', 'country']),
            'aircraft' => DB::table('aircraft')
                ->where('airline_company_id', $companyId)
                ->orderBy('model')->get(['id', 'model', 'capacity']),
        ]);
    }

    public function createAircraft(Request $request): JsonResponse
    {
        $companyId = (int) $request->user()->airline_company_id;
        $data = $request->validate([
            'model' => [
                'required', 'string', 'max:120',
                Rule::unique('aircraft', 'model')->where('airline_company_id', $companyId),
            ],
            'capacity' => ['required', 'integer', 'min:1', 'max:2000'],
            'total_flight_hours' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'maintenance_threshold' => ['required', 'numeric', 'gt:0', 'max:999999.99'],
        ]);

        $aircraftId = DB::table('aircraft')->insertGetId([
            ...$data,
            'airline_company_id' => $companyId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Aircraft added to your fleet.',
            'aircraft' => DB::table('aircraft')
                ->where('id', $aircraftId)
                ->first(['id', 'model', 'capacity', 'total_flight_hours', 'maintenance_threshold']),
        ], 201);
    }

    public function update(Request $request, int $flightId): JsonResponse
    {
        $companyId = (int) $request->user()->airline_company_id;
        $data = $request->validate([
            'aircraft_id' => [
                'required', 'integer',
                Rule::exists('aircraft', 'id')->where('airline_company_id', $companyId),
            ],
            'origin' => ['required', 'string', 'max:255', 'different:destination'],
            'destination' => ['required', 'string', 'max:255', 'different:origin'],
            'departure' => ['required', 'date'],
            'arrival' => ['required', 'date', 'after:departure'],
            'status' => ['required', 'string', 'in:scheduled,delayed,cancelled,completed'],
            'base_fare' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'currency' => ['required', 'string', 'regex:/^[A-Za-z]{3}$/'],
        ]);

        $updated = DB::table('flights')
            ->where('id', $flightId)
            ->where('airline_company_id', $companyId)
            ->update([
                ...$data,
                'currency' => strtoupper($data['currency']),
                'updated_at' => now(),
            ]);

        $flightQuery = DB::table('flights as f')
            ->join('aircraft as ac', 'ac.id', '=', 'f.aircraft_id')
            ->where('f.id', $flightId)
            ->where('f.airline_company_id', $companyId);

        if (! $updated && ! $flightQuery->exists()) {
            return response()->json(['message' => 'Flight not found for this airline.'], 404);
        }

        return response()->json([
            'message' => 'Flight details updated.',
            'flight' => $flightQuery->first([
                'f.id', 'f.airline_company_id', 'f.aircraft_id', 'f.origin', 'f.destination', 'f.departure', 'f.arrival',
                'f.status', 'f.base_fare', 'f.currency', 'ac.model as aircraft_model', 'ac.capacity',
            ]),
        ]);
    }
}
