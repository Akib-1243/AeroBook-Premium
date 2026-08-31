<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $now = Carbon::now();

        $userId = DB::transaction(function () use ($data, $now): int {
            $hashedPassword = Hash::make($data['password']);

            DB::insert(
                "INSERT INTO users (name, email, email_verified_at, password, role, created_at, updated_at)
                 VALUES (:name, :email, :verified_at, :password, :role, :created, :updated)",
                [
                    'name'         => $data['name'],
                    'email'        => $data['email'],
                    'verified_at'  => $now,
                    'password'     => $hashedPassword,
                    'role'         => 'user',
                    'created'      => $now,
                    'updated'      => $now,
                ]
            );

            $userId = DB::getPdo()->lastInsertId();

            DB::insert(
                "INSERT INTO passengers (user_id, name, email, passport, frequent_flyer_points, created_at, updated_at)
                 VALUES (:user_id, :name, :email, :passport, :points, :created, :updated)",
                [
                    'user_id'  => $userId,
                    'name'     => $data['name'],
                    'email'    => $data['email'],
                    'passport' => $data['passport'],
                    'points'   => 0,
                    'created'  => $now,
                    'updated'  => $now,
                ]
            );

            return (int) $userId;
        });

        $user = User::findOrFail($userId);
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message'      => 'Registration successful.',
            'token_type'   => 'Bearer',
            'access_token' => $token,
            'user'         => $this->serializeUserWithPassenger($user->id),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $rows = DB::select(
            "SELECT id, name, email, password, role FROM users WHERE email = :email",
            ['email' => $credentials['email']]
        );

        if (empty($rows) || ! Hash::check($credentials['password'], $rows[0]->password)) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 422);
        }

        // Revoke all previous tokens for this user via raw SQL
        DB::delete(
            "DELETE FROM personal_access_tokens
             WHERE tokenable_type = :type AND tokenable_id = :id",
            ['type' => User::class, 'id' => $rows[0]->id]
        );

        $user = User::findOrFail($rows[0]->id);
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message'      => 'Login successful.',
            'token_type'   => 'Bearer',
            'access_token' => $token,
            'user'         => $this->serializeUserWithPassenger($user->id),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => $this->serializeUserWithPassenger($user->id),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        // Delete the current access token via raw SQL
        if ($user) {
            $tokenId = $user->currentAccessToken()?->id;

            if ($tokenId) {
                DB::delete(
                    "DELETE FROM personal_access_tokens WHERE id = :id",
                    ['id' => $tokenId]
                );
            }
        }

        return response()->json([
            'message' => 'Logout successful.',
        ]);
    }

    private function serializeUserWithPassenger(int $userId): array
    {
        $userRow = DB::select(
            "SELECT id, name, email, email_verified_at, role, created_at, updated_at
             FROM users WHERE id = :id",
            ['id' => $userId]
        );

        $passengerRow = DB::select(
            "SELECT id, user_id, name, email, passport, frequent_flyer_points, created_at, updated_at
             FROM passengers WHERE user_id = :user_id",
            ['user_id' => $userId]
        );

        $user = $userRow[0] ?? null;

        return [
            'id'                => $user->id ?? null,
            'name'              => $user->name ?? null,
            'email'             => $user->email ?? null,
            'role'              => $user->role ?? 'user',
            'email_verified_at' => $user->email_verified_at ?? null,
            'created_at'        => $user->created_at ?? null,
            'updated_at'        => $user->updated_at ?? null,
            'passenger'         => $passengerRow[0] ?? null,
        ];
    }
}
