<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $rows = DB::select('EXEC dbo.usp_admin_dashboard');

        if (empty($rows) || empty($rows[0]->dashboard_json)) {
            return response()->json(['message' => 'Dashboard data is unavailable.'], 503);
        }

        return response()->json(json_decode($rows[0]->dashboard_json, true, 512, JSON_THROW_ON_ERROR));
    }
}
