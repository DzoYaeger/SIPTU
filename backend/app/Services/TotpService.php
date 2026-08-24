<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class TotpService
{
    protected Google2FA $google2fa;

    public function __construct()
    {
        $this->google2fa = new Google2FA();
    }

    /**
     * Generate a new TOTP secret key.
     */
    public function generateSecret(): string
    {
        return $this->google2fa->generateSecretKey(32);
    }

    /**
     * Get the otpauth:// URI for QR code generation.
     */
    public function getQrCodeUri(User $user, string $secret): string
    {
        $issuer = 'SIPTU BPOM Palopo';
        $holder = $user->nip ?? $user->email ?? $user->name;

        return $this->google2fa->getQRCodeUrl($issuer, $holder, $secret);
    }

    /**
     * Verify a TOTP code against the user's stored secret.
     * Allows ±1 time window (30 seconds tolerance).
     */
    public function verifyCode(User $user, string $code): bool
    {
        if (!$user->mfa_enabled || !$user->mfa_secret) {
            Log::warning("[TOTP] MFA not enabled or secret missing for User ID {$user->id}");
            return false;
        }

        $secret = $this->decryptSecret($user->mfa_secret);
        if (!$secret) {
            Log::warning("[TOTP] Failed to decrypt MFA secret for User ID {$user->id}");
            return false;
        }

        $code = preg_replace('/\D/', '', $code);

        // window = 10 allows ±5 minutes tolerance for clock drift between server and mobile device
        $valid = (bool) $this->google2fa->verifyKey($secret, $code, 10);
        if (!$valid) {
            Log::warning("[TOTP] Code verification failed for User ID {$user->id} (NIP: {$user->nip})", [
                'input_code_len' => strlen($code),
                'secret_len' => strlen($secret),
            ]);
        }
        return $valid;
    }

    /**
     * Verify a TOTP code against a raw (not yet stored) secret.
     * Used during MFA setup confirmation.
     */
    public function verifyCodeWithSecret(string $secret, string $code): bool
    {
        $code = preg_replace('/\D/', '', $code);
        // window = 8 allows ±4 minutes tolerance for clock drift
        return (bool) $this->google2fa->verifyKey($secret, $code, 8);
    }

    /**
     * Generate 8 random recovery codes.
     */
    public function generateRecoveryCodes(): array
    {
        $codes = [];
        for ($i = 0; $i < 8; $i++) {
            $codes[] = strtoupper(Str::random(4) . '-' . Str::random(4));
        }
        return $codes;
    }

    /**
     * Verify and consume a recovery code.
     * Returns true if the code was valid and has been consumed.
     */
    public function verifyRecoveryCode(User $user, string $code): bool
    {
        $codes = $user->mfa_recovery_codes;
        if (!is_array($codes) || empty($codes)) {
            return false;
        }

        $normalizedCode = strtoupper(trim($code));
        $index = array_search($normalizedCode, $codes);

        if ($index === false) {
            return false;
        }

        // Remove the used code
        unset($codes[$index]);
        $user->mfa_recovery_codes = array_values($codes);
        $user->save();

        return true;
    }

    /**
     * Start/refresh active MFA session for user (default 20 minutes).
     */
    public function startSession(User $user, int $minutes = 20): void
    {
        if (!$user || !$user->id) return;
        $cacheKey = "mfa_session_{$user->id}";
        Cache::put($cacheKey, now()->addMinutes($minutes)->timestamp, now()->addMinutes($minutes));
    }

    /**
     * Check if user currently has an active MFA session within 20 minutes.
     */
    public function isSessionActive(User $user): bool
    {
        if (!$user || !$user->id) return false;
        $cacheKey = "mfa_session_{$user->id}";
        return Cache::has($cacheKey);
    }

    /**
     * Get remaining TTL seconds for active MFA session (0 if expired/none).
     */
    public function getSessionTtl(User $user): int
    {
        if (!$user || !$user->id) return 0;
        $cacheKey = "mfa_session_{$user->id}";
        $timestamp = Cache::get($cacheKey);
        if (!$timestamp) return 0;
        $remaining = (int)$timestamp - now()->timestamp;
        return max(0, $remaining);
    }

    /**
     * Helper to verify either a 6-digit TOTP code, an 8-character recovery code,
     * or fallback to an active 20-minute MFA session if code is blank.
     */
    public function verifyCodeOrRecovery(User $user, ?string $code = null): bool
    {
        $code = trim((string)$code);

        if ($code !== '') {
            $isValid = false;
            $numericCode = preg_replace('/\D/', '', $code);

            if (strlen($numericCode) === 6) {
                $isValid = $this->verifyCode($user, $numericCode);
            } elseif (preg_match('/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/', $code) || strlen($code) === 8) {
                $isValid = $this->verifyRecoveryCode($user, $code);
            }

            if ($isValid) {
                $this->startSession($user, 20);
                return true;
            }

            return false;
        }

        // If code is empty/blank, check if user has an active 20-minute MFA session
        if ($this->isSessionActive($user)) {
            return true;
        }

        return false;
    }

    /**
     * Encrypt a secret for storage.
     */
    public function encryptSecret(string $secret): string
    {
        return Crypt::encryptString($secret);
    }

    /**
     * Decrypt a stored secret with fallback.
     */
    public function decryptSecret(string $encrypted): ?string
    {
        try {
            return Crypt::decryptString($encrypted);
        } catch (\Exception $e) {
            // Fallback for unencrypted secrets or APP_KEY rotation
            return $encrypted;
        }
    }
}
