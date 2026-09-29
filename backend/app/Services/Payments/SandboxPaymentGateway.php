<?php

namespace App\Services\Payments;

use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SandboxPaymentGateway
{
    public function tokenize(array $card): array
    {
        $methodType = strtolower((string) ($card['payment_method_type'] ?? 'card'));
        $number = preg_replace('/\D+/', '', (string) ($card['card_number'] ?? ''));
        $walletReference = preg_replace('/\D+/', '', (string) ($card['wallet_reference'] ?? $card['account_number'] ?? $card['bank_reference'] ?? $card['reference'] ?? ''));
        $lastFour = $methodType === 'card' ? substr($number, -4) : substr($walletReference ?: '4242', -4);
        $brand = $this->brand($number, $methodType, $card['wallet_name'] ?? $card['bank_name'] ?? null);

        return [
            'gateway' => 'sandbox',
            'gateway_customer_ref' => 'sandbox_customer_' . $card['user_id'],
            'gateway_method_ref' => 'sandbox_pm_' . Str::random(32),
            'payment_method_type' => $methodType,
            'brand' => $brand,
            'last_four' => $lastFour !== '' ? $lastFour : '0000',
            'expiry_month' => (int) ($card['expiry_month'] ?? 12),
            'expiry_year' => (int) ($card['expiry_year'] ?? now()->year + 2),
        ];
    }

    public function charge(object|array $paymentMethod, int $amountMinor): array
    {
        $methodType = is_object($paymentMethod) ? ($paymentMethod->payment_method_type ?? $paymentMethod->method_type ?? 'card') : ($paymentMethod['payment_method_type'] ?? $paymentMethod['method_type'] ?? 'card');
        $lastFour = is_object($paymentMethod) ? ($paymentMethod->last_four ?? '4242') : ($paymentMethod['last_four'] ?? '4242');

        if ($methodType === 'card') {
            return match (true) {
                str_ends_with((string) $lastFour, '0000') => [
                    'status' => 'failed',
                    'reference' => 'sbx_txn_' . Str::lower(Str::random(24)),
                    'amount_minor' => $amountMinor,
                    'message' => 'Card declined: invalid payment details.',
                ],
                str_ends_with((string) $lastFour, '1111') => [
                    'status' => 'pending',
                    'reference' => 'sbx_txn_' . Str::lower(Str::random(24)),
                    'amount_minor' => $amountMinor,
                    'message' => 'Payment initiated and awaiting gateway confirmation.',
                ],
                str_ends_with((string) $lastFour, '2222') => [
                    'status' => 'failed',
                    'reference' => 'sbx_txn_' . Str::lower(Str::random(24)),
                    'amount_minor' => $amountMinor,
                    'message' => 'Insufficient funds.',
                ],
                str_ends_with((string) $lastFour, '3333') => [
                    'status' => 'pending',
                    'reference' => 'sbx_txn_' . Str::lower(Str::random(24)),
                    'amount_minor' => $amountMinor,
                    'message' => 'Gateway timeout. Retry after a short wait.',
                ],
                default => [
                    'status' => 'completed',
                    'reference' => 'sbx_txn_' . Str::lower(Str::random(24)),
                    'amount_minor' => $amountMinor,
                    'message' => 'Sandbox payment approved.',
                ],
            };
        }

        if (in_array($methodType, ['wallet', 'wallet_balance', 'bank_transfer', 'cod'], true)) {
            return [
                'status' => 'completed',
                'reference' => 'sbx_' . $methodType . '_' . Str::lower(Str::random(20)),
                'amount_minor' => $amountMinor,
                'message' => 'Mock payment accepted for sandbox checkout.',
            ];
        }

        return [
            'status' => 'pending',
            'reference' => 'sbx_' . $methodType . '_' . Str::lower(Str::random(20)),
            'amount_minor' => $amountMinor,
            'message' => 'Payment queued for manual processing.',
        ];
    }

    public function refund(string $transactionReference): string
    {
        return 'sbx_ref_' . substr(hash('sha256', $transactionReference . Str::random(16)), 0, 24);
    }

    public function describe(): array
    {
        return [
            'mode' => 'sandbox',
            'provider' => 'AeroBook Sandbox Gateway',
            'currency' => 'USD',
            'tokenization_enabled' => true,
            'charges_simulated' => true,
            'refunds_simulated' => true,
            'supported_methods' => [
                ['type' => 'card', 'label' => 'Card', 'providers' => ['Visa', 'Mastercard', 'Local cards']],
                ['type' => 'wallet', 'label' => 'Mobile wallet', 'providers' => ['bKash', 'Nagad', 'Rocket']],
                ['type' => 'bank_transfer', 'label' => 'Net banking / bank transfer', 'providers' => ['City Bank', 'Dutch Bangla Bank', 'BRAC Bank']],
                ['type' => 'cod', 'label' => 'Cash on delivery', 'providers' => ['Pay at office']],
                ['type' => 'wallet_balance', 'label' => 'Wallet balance', 'providers' => ['AeroBook wallet']],
                ['type' => 'split_payment', 'label' => 'Split payment', 'providers' => ['Wallet + card']],
            ],
            'transaction_statuses' => ['initiated', 'pending', 'success', 'failed', 'expired', 'refund_pending', 'refunded', 'partially_refunded'],
            'test_cards' => [
                ['brand' => 'Visa', 'last_four' => '4242', 'result' => 'Approved'],
                ['brand' => 'Visa', 'last_four' => '0000', 'result' => 'Failed'],
                ['brand' => 'Visa', 'last_four' => '1111', 'result' => 'Pending then success'],
                ['brand' => 'Visa', 'last_four' => '2222', 'result' => 'Insufficient funds'],
                ['brand' => 'Visa', 'last_four' => '3333', 'result' => 'Gateway timeout'],
            ],
        ];
    }

    private function brand(string $number, string $methodType, ?string $walletName = null): string
    {
        if ($methodType !== 'card') {
            return match ($methodType) {
                'wallet' => $walletName ?: 'bKash',
                'bank_transfer' => $walletName ?: 'Bank transfer',
                'cod' => 'Cash on delivery',
                'wallet_balance' => 'AeroBook wallet',
                'split_payment' => 'Split payment',
                default => 'Payment method',
            };
        }

        return match (true) {
            str_starts_with($number, '4') => 'Visa',
            preg_match('/^(5[1-5]|2[2-7])/', $number) === 1 => 'Mastercard',
            str_starts_with($number, '34'), str_starts_with($number, '37') => 'American Express',
            default => 'Local card',
        };
    }
}
