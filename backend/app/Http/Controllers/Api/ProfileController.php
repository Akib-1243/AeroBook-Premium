<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return response()->json([
            'profile' => DB::table('traveler_profiles')->where('user_id', $user->id)->first(),
            'contact' => [
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at,
                'phone' => $user->phone,
                'phone_verified_at' => null,
            ],
            'preferences' => DB::table('profile_preferences')->where('user_id', $user->id)->first() ?? [
                'email_notifications' => true,
                'sms_notifications' => false,
            ],
            'travelers' => DB::table('saved_travelers')->where('user_id', $user->id)->orderBy('last_name')->orderBy('first_name')->get(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $data = $request->validate([
            'title' => ['nullable', Rule::in(['Mr', 'Mrs', 'Ms', 'Mx', 'Dr'])],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', 'string', 'max:30'],
            'nationality' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:30'],
            'passport_number' => ['nullable', 'string', 'max:50'],
            'passport_issuing_country' => ['nullable', 'string', 'max:100'],
            'passport_issue_date' => ['nullable', 'date'],
            'passport_expiry_date' => ['nullable', 'date', 'after:today'],
            'national_id' => ['nullable', 'string', 'max:100'],
            'visa_information' => ['nullable', 'string', 'max:2000'],
        ]);

        $now = Carbon::now();
        $emailChanged = strcasecmp($user->email, $data['email']) !== 0;
        $fullName = trim($data['first_name'] . ' ' . $data['last_name']);

        DB::transaction(function () use ($data, $user, $now, $emailChanged, $fullName): void {
            DB::table('users')->where('id', $user->id)->update([
                'name' => $fullName,
                'email' => $data['email'],
                'email_verified_at' => $emailChanged ? null : $user->email_verified_at,
                'phone' => $data['phone'] ?? null,
                'updated_at' => $now,
            ]);

            $profileValues = collect($data)->except(['email', 'phone'])->merge(['updated_at' => $now]);
            if (! DB::table('traveler_profiles')->where('user_id', $user->id)->exists()) {
                $profileValues->put('created_at', $now);
            }
            DB::table('traveler_profiles')->updateOrInsert(['user_id' => $user->id], $profileValues->all());

            DB::table('passengers')->where('user_id', $user->id)->update([
                'name' => $fullName,
                'email' => $data['email'],
                'passport' => $data['passport_number'] ?? null,
                'phone' => $data['phone'] ?? null,
                'updated_at' => $now,
            ]);
        });

        return response()->json(['message' => 'Profile saved.', 'user' => [
            'id' => $user->id,
            'name' => $fullName,
            'email' => $data['email'],
            'email_verified_at' => $emailChanged ? null : $user->email_verified_at,
            'phone' => $data['phone'] ?? null,
            'role' => $user->role,
            'passport' => $data['passport_number'] ?? null,
            'passenger' => DB::table('passengers')->where('user_id', $user->id)->first(),
        ]]);
    }

    public function sendEmailCode(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $data = $request->validate(['email' => ['required', 'email', 'max:255']]);

        if (strcasecmp($user->email, $data['email']) !== 0) {
            return response()->json(['message' => 'Save this email address before verifying it.'], 422);
        }

        $code = (string) random_int(100000, 999999);
        DB::table('profile_verification_codes')->where('user_id', $user->id)->where('type', 'email')->delete();
        DB::table('profile_verification_codes')->insert([
            'user_id' => $user->id,
            'type' => 'email',
            'destination' => $user->email,
            'code_hash' => Hash::make($code),
            'expires_at' => Carbon::now()->addMinutes(10),
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        Mail::raw("Your AeroBook email verification code is: {$code}\n\nThis code expires in 10 minutes.", function ($message) use ($user): void {
            $message->to($user->email)->subject('Verify your AeroBook email');
        });

        return response()->json(['message' => 'Verification code sent. Check your email inbox.']);
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $data = $request->validate(['code' => ['required', 'digits:6']]);
        $verification = DB::table('profile_verification_codes')
            ->where('user_id', $user->id)
            ->where('type', 'email')
            ->where('destination', $user->email)
            ->first();

        if (! $verification || Carbon::parse($verification->expires_at)->isPast() || ! Hash::check($data['code'], $verification->code_hash)) {
            return response()->json(['message' => 'That code is invalid or expired. Request a new one.'], 422);
        }

        DB::table('users')->where('id', $user->id)->update(['email_verified_at' => Carbon::now()]);
        DB::table('profile_verification_codes')->where('id', $verification->id)->delete();

        return response()->json(['message' => 'Email verified.']);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $data = $request->validate([
            'email_notifications' => ['required', 'boolean'],
            'sms_notifications' => ['required', 'boolean'],
        ]);
        $now = Carbon::now();

        $preferenceValues = [...$data, 'updated_at' => $now];
        if (! DB::table('profile_preferences')->where('user_id', $user->id)->exists()) {
            $preferenceValues['created_at'] = $now;
        }
        DB::table('profile_preferences')->updateOrInsert(['user_id' => $user->id], $preferenceValues);

        return response()->json(['message' => 'Notification preferences saved.', 'preferences' => $data]);
    }

    public function addTraveler(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $data = $this->validateTraveler($request);
        $id = DB::table('saved_travelers')->insertGetId([
            ...$data,
            'user_id' => $user->id,
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        return response()->json(['traveler' => DB::table('saved_travelers')->where('id', $id)->first()], 201);
    }

    public function updateTraveler(Request $request, int $travelerId): JsonResponse
    {
        $user = $this->user($request);
        $data = $this->validateTraveler($request);
        $updated = DB::table('saved_travelers')->where('user_id', $user->id)->where('id', $travelerId)->update([
            ...$data,
            'updated_at' => Carbon::now(),
        ]);

        if (! $updated && ! DB::table('saved_travelers')->where('user_id', $user->id)->where('id', $travelerId)->exists()) {
            return response()->json(['message' => 'Saved traveler not found.'], 404);
        }

        return response()->json(['traveler' => DB::table('saved_travelers')->where('id', $travelerId)->first()]);
    }

    public function deleteTraveler(Request $request, int $travelerId): JsonResponse
    {
        $user = $this->user($request);
        $deleted = DB::table('saved_travelers')->where('user_id', $user->id)->where('id', $travelerId)->delete();

        return $deleted
            ? response()->json(['message' => 'Saved traveler removed.'])
            : response()->json(['message' => 'Saved traveler not found.'], 404);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'Your current password is incorrect.'], 422);
        }

        DB::table('users')->where('id', $user->id)->update([
            'password' => Hash::make($data['password']),
            'updated_at' => Carbon::now(),
        ]);
        DB::table('personal_access_tokens')->where('tokenable_type', User::class)->where('tokenable_id', $user->id)
            ->where('id', '<>', $user->currentAccessToken()?->id ?? 0)->delete();

        return response()->json(['message' => 'Password changed. Other active sessions were signed out.']);
    }

    public function sessions(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $currentTokenId = $user->currentAccessToken()?->id;
        $sessions = DB::table('personal_access_tokens')
            ->where('tokenable_type', User::class)
            ->where('tokenable_id', $user->id)
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'created_at', 'last_used_at'])
            ->map(fn ($session) => [...(array) $session, 'current' => (int) $session->id === (int) $currentTokenId]);

        $history = DB::table('account_login_history')->where('user_id', $user->id)
            ->orderByDesc('logged_in_at')->limit(20)->get(['ip_address', 'user_agent', 'logged_in_at']);

        return response()->json(['sessions' => $sessions, 'login_history' => $history]);
    }

    public function revokeSession(Request $request, int $tokenId): JsonResponse
    {
        $user = $this->user($request);
        $deleted = DB::table('personal_access_tokens')
            ->where('id', $tokenId)
            ->where('tokenable_type', User::class)
            ->where('tokenable_id', $user->id)
            ->delete();

        return $deleted
            ? response()->json(['message' => 'Session revoked.'])
            : response()->json(['message' => 'Session not found.'], 404);
    }

    public function deleteAccount(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $data = $request->validate(['password' => ['required', 'string']]);

        if (! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Your password is incorrect.'], 422);
        }

        DB::transaction(function () use ($user): void {
            DB::table('personal_access_tokens')->where('tokenable_type', User::class)->where('tokenable_id', $user->id)->delete();
            $user->delete();
        });

        return response()->json(['message' => 'Your account has been deleted.']);
    }

    private function validateTraveler(Request $request): array
    {
        return $request->validate([
            'title' => ['nullable', Rule::in(['Mr', 'Mrs', 'Ms', 'Mx', 'Dr'])],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', 'string', 'max:30'],
            'nationality' => ['nullable', 'string', 'max:100'],
            'passport_number' => ['nullable', 'string', 'max:50'],
            'passport_issuing_country' => ['nullable', 'string', 'max:100'],
            'passport_issue_date' => ['nullable', 'date'],
            'passport_expiry_date' => ['nullable', 'date', 'after:today'],
            'national_id' => ['nullable', 'string', 'max:100'],
            'visa_information' => ['nullable', 'string', 'max:2000'],
        ]);
    }

    private function user(Request $request): User
    {
        abort_unless($request->user() instanceof User, 403, 'This area is for customer accounts.');

        return $request->user();
    }
}
