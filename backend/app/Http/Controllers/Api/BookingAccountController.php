<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use App\Services\Payments\SandboxPaymentGateway;

class BookingAccountController extends Controller
{
    private function normalizeDefaultFlag(mixed $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN) || $value === 1 || $value === '1';
    }

    public function transactions(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $transactions = DB::table('payments as payments')
            ->join('bookings as bookings', 'bookings.id', '=', 'payments.booking_id')
            ->join('passengers as passengers', 'passengers.id', '=', 'bookings.passenger_id')
            ->join('flights as flights', 'flights.id', '=', 'bookings.flight_id')
            ->leftJoin('saved_payment_methods as methods', 'methods.id', '=', 'payments.payment_method_id')
            ->where('passengers.user_id', $userId)
            ->orderByDesc('payments.payment_date')
            ->get([
                'payments.id', 'payments.booking_id', 'payments.amount', 'payments.payment_date', 'payments.status',
                'payments.gateway', 'payments.transaction_reference', 'methods.brand', 'methods.last_four',
                'flights.origin', 'flights.destination', 'flights.departure',
            ]);

        return response()->json(['data' => $transactions]);
    }

    public function paymentMethods(Request $request, SandboxPaymentGateway $gateway): JsonResponse
    {
        $methods = DB::table('saved_payment_methods')
            ->where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->orderByDesc('is_default')
            ->orderByDesc('created_at')
            ->get(['id', 'gateway', 'brand', 'last_four', 'expiry_month', 'expiry_year', 'is_default', 'created_at'])
            ->map(fn ($method) => [...(array) $method, 'is_default' => $this->normalizeDefaultFlag($method->is_default)]);

        return response()->json([
            'data' => $methods,
            'gateway' => $gateway->describe(),
        ]);
    }

    public function tokenizePaymentMethod(Request $request, SandboxPaymentGateway $gateway): JsonResponse
    {
        $data = $request->validate([
            'payment_method_type' => ['nullable', 'string', 'in:card,wallet,bank_transfer,cod,wallet_balance,split_payment'],
            'cardholder_name' => ['nullable', 'string', 'max:120'],
            'card_number' => ['nullable', 'string', 'regex:/^[0-9 -]{13,23}$/'],
            'expiry_month' => ['nullable', 'integer', 'between:1,12'],
            'expiry_year' => ['nullable', 'integer', 'min:' . now()->year, 'max:' . (now()->year + 20)],
            'security_code' => ['nullable', 'string', 'regex:/^[0-9]{3,8}$/'],
            'wallet_name' => ['nullable', 'string', 'max:80'],
            'wallet_reference' => ['nullable', 'string', 'max:80'],
            'bank_name' => ['nullable', 'string', 'max:80'],
            'make_default' => ['sometimes', 'boolean'],
        ]);

        $methodType = strtolower((string) ($data['payment_method_type'] ?? 'card'));

        if ($methodType === 'card') {
            $request->validate([
                'cardholder_name' => ['required', 'string', 'max:120'],
                'card_number' => ['required', 'string', 'regex:/^[0-9 -]{13,23}$/'],
                'expiry_month' => ['required', 'integer', 'between:1,12'],
                'expiry_year' => ['required', 'integer', 'min:' . now()->year, 'max:' . (now()->year + 20)],
                'security_code' => ['required', 'string', 'regex:/^[0-9]{3,8}$/'],
            ]);

            if ((int) $data['expiry_year'] === now()->year && (int) $data['expiry_month'] < now()->month) {
                return response()->json(['message' => 'Card expiry date must be in the future.'], 422);
            }

            $digits = preg_replace('/\D+/', '', $data['card_number']);
            $allowedCards = ['4242424242424242', '4000000000000002', '1111111111111111', '2222222222222222', '3333333333333333'];
            if (! in_array($digits, $allowedCards, true) && ! preg_match('/^(?:4|5|2)/', $digits)) {
                return response()->json([
                    'message' => 'Sandbox accepts mock card numbers only. Use a valid Visa/Mastercard test number or one of the published sandbox scenarios.',
                ], 422);
            }
        }

        $methodData = $gateway->tokenize([...$data, 'user_id' => $request->user()->id]);
        $methodId = DB::transaction(function () use ($request, $methodData, $data): int {
            $makeDefault = (bool) ($data['make_default'] ?? false)
                || ! DB::table('saved_payment_methods')->where('user_id', $request->user()->id)->where('status', 'active')->exists();

            if ($makeDefault) {
                DB::table('saved_payment_methods')->where('user_id', $request->user()->id)->update(['is_default' => false]);
            }

            return (int) DB::table('saved_payment_methods')->insertGetId([
                ...$methodData,
                'user_id' => $request->user()->id,
                'is_default' => $makeDefault,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        $paymentMethod = DB::table('saved_payment_methods')->where('id', $methodId)
            ->first(['id', 'gateway', 'brand', 'last_four', 'expiry_month', 'expiry_year', 'is_default']);

        return response()->json([
            'message' => 'Sandbox method saved. No real card data was stored.',
            'payment_method' => [...(array) $paymentMethod, 'is_default' => $this->normalizeDefaultFlag($paymentMethod->is_default)],
        ], 201);
    }

    public function setDefaultPaymentMethod(Request $request, int $methodId): JsonResponse
    {
        $method = DB::table('saved_payment_methods')->where('id', $methodId)
            ->where('user_id', $request->user()->id)->where('status', 'active')->first();

        if (! $method) {
            return response()->json(['message' => 'Saved payment method not found.'], 404);
        }

        DB::transaction(function () use ($request, $methodId): void {
            DB::table('saved_payment_methods')->where('user_id', $request->user()->id)->update(['is_default' => false]);
            DB::table('saved_payment_methods')->where('id', $methodId)->update(['is_default' => true, 'updated_at' => now()]);
        });

        return response()->json(['message' => 'Default payment method updated.']);
    }

    public function removePaymentMethod(Request $request, int $methodId): JsonResponse
    {
        $method = DB::table('saved_payment_methods')
            ->where('id', $methodId)
            ->where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->first();

        if (! $method) {
            return response()->json(['message' => 'Saved payment method not found.'], 404);
        }

        DB::transaction(function () use ($request, $method, $methodId): void {
            DB::table('saved_payment_methods')->where('id', $methodId)->update([
                'status' => 'removed',
                'is_default' => false,
                'updated_at' => now(),
            ]);

            if ($method->is_default) {
                $replacement = DB::table('saved_payment_methods')->where('user_id', $request->user()->id)
                    ->where('status', 'active')->orderByDesc('created_at')->first(['id']);
                if ($replacement) {
                    DB::table('saved_payment_methods')->where('id', $replacement->id)->update(['is_default' => true, 'updated_at' => now()]);
                }
            }
        });

        return response()->json(['message' => 'Saved payment method removed.']);
    }

    public function refunds(Request $request): JsonResponse
    {
        $refunds = DB::table('refund_requests as refunds')
            ->join('bookings as bookings', 'bookings.id', '=', 'refunds.booking_id')
            ->join('flights as flights', 'flights.id', '=', 'bookings.flight_id')
            ->where('refunds.user_id', $request->user()->id)
            ->orderByDesc('refunds.created_at')
            ->get([
                'refunds.id', 'refunds.booking_id', 'refunds.payment_id', 'refunds.amount', 'refunds.currency',
                'refunds.reason', 'refunds.status', 'refunds.gateway_ref', 'refunds.created_at', 'refunds.resolved_at',
                'flights.origin', 'flights.destination', 'flights.departure',
            ]);

        return response()->json(['data' => $refunds]);
    }

    public function cancelBooking(Request $request, int $bookingId, SandboxPaymentGateway $gateway): JsonResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:500']]);
        $userId = $request->user()->id;

        $result = DB::transaction(function () use ($bookingId, $userId, $data, $gateway): array {
            $booking = DB::table('bookings')
                ->join('passengers', 'passengers.id', '=', 'bookings.passenger_id')
                ->join('flights', 'flights.id', '=', 'bookings.flight_id')
                ->where('bookings.id', $bookingId)
                ->where('passengers.user_id', $userId)
                ->lockForUpdate()
                ->first([
                    'bookings.id', 'bookings.seat_id', 'bookings.status',
                    'flights.departure',
                ]);

            if (! $booking) {
                return ['error' => 'Booking not found.', 'status' => 404];
            }
            if (in_array(strtolower($booking->status), ['cancelled', 'canceled'], true)) {
                return ['error' => 'This booking is already cancelled.', 'status' => 409];
            }
            // An expired hold already gave its seat back, and someone else may have bought it since.
            if (strtolower($booking->status) === 'expired') {
                return ['error' => 'This booking has expired and its seat has been released.', 'status' => 409];
            }
            if (Carbon::parse($booking->departure)->isPast()) {
                return ['error' => 'A departed flight cannot be cancelled online.', 'status' => 409];
            }

            $payment = DB::table('payments')->where('booking_id', $bookingId)->orderByDesc('id')->first();
            $now = Carbon::now();
            DB::table('bookings')->where('id', $bookingId)->update(['status' => 'cancelled', 'updated_at' => $now]);
            DB::table('seats')->where('id', $booking->seat_id)->update(['is_booked' => false, 'status' => 'available', 'updated_at' => $now]);

            $refundCreated = false;
            if ($payment && in_array(strtolower($payment->status), ['paid', 'completed', 'succeeded'], true)) {
                $existingRefund = DB::table('refund_requests')->where('booking_id', $bookingId)
                    ->whereNotIn('status', ['rejected', 'failed'])->exists();

                if (! $existingRefund) {
                    DB::table('refund_requests')->insert([
                        'user_id' => $userId,
                        'booking_id' => $bookingId,
                        'payment_id' => $payment->id,
                        'amount' => $payment->amount,
                        'currency' => 'USD',
                        'reason' => $data['reason'] ?? null,
                        'status' => 'processed',
                        'gateway_ref' => $gateway->refund($payment->transaction_reference ?? ('payment_' . $payment->id)),
                        'resolved_at' => $now,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    DB::table('payments')->where('id', $payment->id)->update(['status' => 'refunded', 'updated_at' => $now]);
                    $refundCreated = true;
                }
            }

            return ['refund_requested' => $refundCreated];
        });

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], $result['status']);
        }

        return response()->json([
            'message' => 'Booking cancelled.',
            'refund_requested' => $result['refund_requested'],
            'refund_note' => $result['refund_requested']
                ? 'Sandbox refund processed. No real payment was moved.'
                : null,
        ]);
    }
}
