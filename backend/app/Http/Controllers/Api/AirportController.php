<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AirportController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => DB::table('airports')
                ->select(['id', 'code', 'city', 'country'])
                ->orderBy('city')
                ->get(),
        ]);
    }
}
