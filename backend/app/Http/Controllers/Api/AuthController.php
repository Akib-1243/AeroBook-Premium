<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Admin;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

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

        if (empty($rows)) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 422);
        }

        if (! Hash::check($credentials['password'], $rows[0]->password)) {
            return response()->json([
                'message' => 'Wrong password.',
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

    public function adminLogin(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $admin = DB::selectOne(
            'SELECT id, name, email, password, role FROM admins WHERE email = :email',
            ['email' => $credentials['email']]
        );

        if (! $admin) {
            return response()->json(['message' => 'Invalid admin credentials.'], 422);
        }

        if (! Hash::check($credentials['password'], $admin->password)) {
            return response()->json(['message' => 'Wrong admin password.'], 422);
        }

        DB::delete(
            'DELETE FROM personal_access_tokens WHERE tokenable_type = :type AND tokenable_id = :id',
            ['type' => Admin::class, 'id' => $admin->id]
        );

        $adminModel = Admin::findOrFail($admin->id);
        $token = $adminModel->createToken('admin-auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Admin login successful.',
            'token_type' => 'Bearer',
            'access_token' => $token,
            'user' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => 'admin',
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => $this->serializeUserWithPassenger($user->id),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'passport' => ['required', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $now = Carbon::now();

        DB::transaction(function () use ($data, $user, $now): void {
            DB::update(
                'UPDATE users SET name = :name, email = :email, phone = :phone, updated_at = :updated_at WHERE id = :id',
                [
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'phone' => $data['phone'] ?? null,
                    'updated_at' => $now,
                    'id' => $user->id,
                ]
            );

            DB::update(
                'UPDATE passengers SET name = :name, email = :email, passport = :passport, phone = :phone, updated_at = :updated_at WHERE user_id = :user_id',
                [
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'passport' => $data['passport'] ?? null,
                    'phone' => $data['phone'] ?? null,
                    'updated_at' => $now,
                    'user_id' => $user->id,
                ]
            );
        });

        return response()->json([
            'message' => 'Profile updated successfully.',
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

    public function requestPasswordReset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $table = $request->input('account_type') === 'admin' ? 'admins' : 'users';
        $user = DB::selectOne(
            "SELECT id, email FROM {$table} WHERE email = :email",
            ['email' => $data['email']]
        );

        if (! $user) {
            return response()->json(['message' => 'No account was found for that email.'], 404);
        }

        $code = (string) random_int(100000, 999999);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($code),
                'created_at' => Carbon::now(),
            ]
        );

        Mail::raw(
            "Your AeroBook password reset security code is: {$code}\n\nThis code expires in 10 minutes.",
            function ($message) use ($user): void {
                $message->to($user->email)->subject('AeroBook password reset code');
            }
        );

        return response()->json([
            'message' => 'A security code has been sent to your email.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'digits:6'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $table = $request->input('account_type') === 'admin' ? 'admins' : 'users';
        $model = $table === 'admins' ? Admin::class : User::class;
        $reset = DB::table('password_reset_tokens')->where('email', $data['email'])->first();

        if (! $reset || Carbon::parse($reset->created_at)->addMinutes(10)->isPast() || ! Hash::check($data['code'], $reset->token)) {
            return response()->json(['message' => 'Invalid or expired security code.'], 422);
        }

        $user = DB::selectOne(
            "SELECT id FROM {$table} WHERE email = :email",
            ['email' => $data['email']]
        );

        if (! $user) {
            return response()->json(['message' => 'No account was found for that email.'], 404);
        }

        $now = Carbon::now();

        DB::transaction(function () use ($data, $user, $now, $table, $model): void {
            DB::update(
            "UPDATE {$table} SET password = :password, updated_at = :updated_at WHERE id = :id",
                [
                    'password' => Hash::make($data['password']),
                    'updated_at' => $now,
                    'id' => $user->id,
                ]
            );

            DB::delete(
                'DELETE FROM personal_access_tokens WHERE tokenable_type = :type AND tokenable_id = :id',
                ['type' => $model, 'id' => $user->id]
            );

            DB::table('password_reset_tokens')->where('email', $data['email'])->delete();
        });

        return response()->json([
            'message' => 'Password changed successfully. Please sign in again.',
        ]);
    }

    private function serializeUserWithPassenger(int $userId): array
    {
        $userRow = DB::select(
            "SELECT id, name, email, email_verified_at, role, phone, created_at, updated_at
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
            'phone'             => $user->phone ?? null,
            'email_verified_at' => $user->email_verified_at ?? null,
            'created_at'        => $user->created_at ?? null,
            'updated_at'        => $user->updated_at ?? null,
            'passenger'         => $passengerRow[0] ?? null,
        ];
    }
}
