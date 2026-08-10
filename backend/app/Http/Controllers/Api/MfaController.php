<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TotpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class MfaController extends Controller
{
    /**
     * Generate MFA setup data (secret + QR code URI).
     * Called when user needs to set up MFA for the first time.
     */
    public function setup(Request $request, TotpService $totpService)
    {
        $user = $request->user();

        $secret = $totpService->generateSecret();

        // Store the pending secret in cache (expires in 10 minutes)
        Cache::put("mfa_setup_{$user->id}", $secret, now()->addMinutes(10));

        $qrCodeUri = $totpService->getQrCodeUri($user, $secret);

        return response()->json([
            'secret' => $secret,
            'qr_code_uri' => $qrCodeUri,
        ]);
    }

    /**
     * Confirm MFA setup with the first valid TOTP code.
     * This activates MFA and generates recovery codes.
     */
    public function confirm(Request $request, TotpService $totpService)
    {
        $request->validate([
            'totp_code' => 'required|string',
        ]);

        $user = $request->user();

        $secret = Cache::get("mfa_setup_{$user->id}");

        if (!$secret) {
            return response()->json([
                'message' => 'Sesi setup MFA telah berakhir. Silakan mulai ulang.',
            ], 422);
        }

        if (!$totpService->verifyCodeWithSecret($secret, $request->totp_code)) {
            return response()->json([
                'message' => 'Kode autentikasi tidak valid. Pastikan kode sudah benar dan belum kadaluarsa.',
            ], 401);
        }

        // Generate recovery codes
        $recoveryCodes = $totpService->generateRecoveryCodes();

        // Save MFA to user
        $user->mfa_secret = $totpService->encryptSecret($secret);
        $user->mfa_enabled = true;
        $user->mfa_recovery_codes = $recoveryCodes;
        $user->mfa_confirmed_at = now();
        $user->save();

        // Clear cache
        Cache::forget("mfa_setup_{$user->id}");

        Log::info("MFA enabled for user {$user->nip} (ID: {$user->id})");

        return response()->json([
            'message' => 'MFA berhasil diaktifkan!',
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * Verify TOTP code during login (step 2).
     * Uses mfa_token from cache to identify the pending login.
     */
    public function verify(Request $request, TotpService $totpService)
    {
        $request->validate([
            'mfa_token' => 'required|string',
            'totp_code' => 'required|string',
        ]);

        $cacheKey = "mfa_pending_{$request->mfa_token}";
        $userId = Cache::get($cacheKey);

        if (!$userId) {
            return response()->json([
                'message' => 'Sesi verifikasi MFA telah berakhir. Silakan login ulang.',
            ], 422);
        }

        $user = User::find($userId);
        if (!$user) {
            return response()->json([
                'message' => 'Pengguna tidak ditemukan.',
            ], 404);
        }

        $code = trim($request->totp_code);
        $isValid = false;

        // Check if it's a TOTP code (6 digits) or recovery code (format: XXXX-XXXX)
        if (preg_match('/^\d{6}$/', $code)) {
            $isValid = $totpService->verifyCode($user, $code);
        } elseif (preg_match('/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/', $code)) {
            $isValid = $totpService->verifyRecoveryCode($user, $code);
        }

        if (!$isValid) {
            return response()->json([
                'message' => 'Kode autentikasi MFA salah atau kadaluarsa. Pastikan Anda memasukkan 6 digit kode terbaru dari aplikasi Authenticator.',
            ], 422);
        }

        // Clear the pending MFA cache
        Cache::forget($cacheKey);

        // Generate Sanctum token (completing login)
        $token = $user->createToken('auth-token')->plainTextToken;

        \App\Services\ActivityLogger::log('login', 'system', 'User logged in (MFA verified)', null, $user);

        return response()->json([
            'user' => $user->load('employee'),
            'token' => $token,
            'token_type' => 'bearer',
        ]);
    }

    /**
     * Disable/reset MFA for self or by Admin for another user.
     */
    public function adminDisable(Request $request, $userId)
    {
        $admin = $request->user();

        $isSelf = (int)$admin->id === (int)$userId;
        $isAdmin = $admin->base_role === 'admin' || in_array('admin', $admin->available_roles ?? []);

        if (!$isSelf && !$isAdmin) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $user = User::findOrFail($userId);

        $user->mfa_secret = null;
        $user->mfa_enabled = false;
        $user->mfa_recovery_codes = null;
        $user->mfa_confirmed_at = null;
        $user->save();

        Log::info("MFA reset by {$admin->nip} for user {$user->nip} (ID: {$user->id})");

        return response()->json([
            'message' => "MFA berhasil di-reset untuk {$user->name} ({$user->nip}). Silakan pendaftaran ulang MFA.",
        ]);
    }
}
