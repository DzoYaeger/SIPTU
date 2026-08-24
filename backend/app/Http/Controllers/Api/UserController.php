<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use App\Models\User;
use App\Models\Employee;

class UserController extends Controller
{
    /**
     * Handle user login.
     */
    public function login(Request $request)
    {
        $request->validate([
            'nip' => 'required|string',
            'password' => 'required|string',
            'recaptcha_token' => 'nullable|string',
        ]);

        $recaptchaToken = $request->input('recaptcha_token');

        // Skip reCAPTCHA check if request is from mobile app or specifies mobile bypass token
        $isMobile = $request->header('X-Client-Type') === 'mobile' || in_array($recaptchaToken, ['mobile_app', 'bypass', 'mobile']);

        if (!$isMobile && $recaptchaToken && !app()->runningUnitTests()) {
            $secretKey = env('RECAPTCHA_SECRET_KEY', '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe');

            try {
                $response = \Illuminate\Support\Facades\Http::asForm()->post('https://www.google.com/recaptcha/api/siteverify', [
                    'secret' => $secretKey,
                    'response' => $recaptchaToken,
                    'remoteip' => $request->ip(),
                ]);

                if (!$response->successful() || !$response->json('success')) {
                    throw ValidationException::withMessages([
                        'recaptcha_token' => ['Verifikasi reCAPTCHA gagal. Silakan coba lagi.'],
                    ]);
                }
            } catch (\Exception $e) {
                if ($e instanceof ValidationException) {
                    throw $e;
                }
                \Illuminate\Support\Facades\Log::error('reCAPTCHA verification error: ' . $e->getMessage());
                throw ValidationException::withMessages([
                    'recaptcha_token' => ['Gagal melakukan verifikasi keamanan. Silakan coba lagi.'],
                ]);
            }
        }

        // Check if user exists by NIP
        $user = User::where('nip', $request->nip)->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'nip' => ['NIP tidak terdaftar dalam sistem.'],
            ]);
        }

        if (!Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Kata sandi yang Anda masukkan salah.'],
            ]);
        }

        // MFA Check:
        // Case 1: User has completed MFA setup -> Require TOTP verification (Step 2)
        if ($user->has_mfa) {
            $mfaToken = (string) Str::uuid();
            \Illuminate\Support\Facades\Cache::put("mfa_pending_{$mfaToken}", $user->id, now()->addMinutes(5));

            return response()->json([
                'requires_mfa' => true,
                'mfa_token' => $mfaToken,
                'message' => 'Silakan masukkan kode autentikasi 6 digit.',
            ]);
        }

        // Case 2: User has NOT set up MFA -> Generate token but flag for mandatory MFA setup
        $token = $user->createToken('auth-token')->plainTextToken;

        \App\Services\ActivityLogger::log('login', 'system', 'User logged in (MFA setup pending)', null, $user);

        return response()->json([
            'user' => $user->load('employee'),
            'token' => $token,
            'token_type' => 'bearer',
            'requires_mfa_setup' => true,
        ]);
    }

    /**
     * Handle user logout.
     */
    public function logout(Request $request)
    {
        \App\Services\ActivityLogger::log('logout', 'system', 'User logged out');
        
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    /**
     * Update user profile (self).
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'phone_number' => 'nullable|string|max:20',
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'user' => $user->load('employee'),
        ]);
    }

    /**
     * Change user password (self).
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Kata sandi saat ini tidak cocok.'],
            ]);
        }

        // Verify that the new password is not the same as the current password
        if (Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Kata sandi baru tidak boleh sama dengan kata sandi saat ini.'],
            ]);
        }

        // Verify against password history
        $history = DB::table('password_histories')
            ->where('user_id', $user->id)
            ->get();

        foreach ($history as $past) {
            if (Hash::check($request->password, $past->password)) {
                throw ValidationException::withMessages([
                    'password' => ['Kata sandi baru sudah pernah digunakan sebelumnya. Silakan pilih kata sandi lain.'],
                ]);
            }
        }

        $user->password = Hash::make($request->password);
        $user->must_reset_password = false;
        $user->password_changed_at = now();
        $user->save();

        // Save to password history
        DB::table('password_histories')->insert([
            'user_id' => $user->id,
            'password' => $user->password,
            'created_at' => now(),
        ]);

        \App\Services\ActivityLogger::log('change_password', 'system', 'User updated password');

        return response()->json([
            'message' => 'Kata sandi berhasil diperbarui.',
            'user' => $user->load('employee'),
        ]);
    }

    /**
     * Upload profile picture (self).
     */
    public function uploadPhoto(Request $request)
    {
        $request->validate([
            'photo' => 'required|file|max:2048',
        ]);

        $file = $request->file('photo');
        $allowedMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
        if (!in_array($file->getMimeType(), $allowedMimes)) {
            return response()->json([
                'message' => 'Format file tidak didukung. Gunakan: PNG, JPG, JPEG, WEBP, GIF',
            ], 422);
        }

        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json([
                'message' => 'Data pegawai untuk akun Anda tidak ditemukan.',
            ], 404);
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: 'png');
        if ($extension === 'jpeg') $extension = 'jpg';
        $filename = 'avatar-' . $employee->nip . '-' . Str::random(6) . '.' . $extension;

        $publicDir = public_path('storage/photos');
        if (!File::exists($publicDir)) {
            File::makeDirectory($publicDir, 0755, true);
        }

        // Delete old photo if exists
        if ($employee->photo) {
            $oldPath = public_path($employee->photo);
            if (File::exists($oldPath)) {
                File::delete($oldPath);
            }
            // Delete from root public_html if exists
            try {
                $oldRootPath = dirname(base_path()) . '/public_html/' . $employee->photo;
                if (File::exists($oldRootPath)) {
                    File::delete($oldRootPath);
                }
            } catch (\Exception $e) {}
        }

        $file->move($publicDir, $filename);
        $path = 'storage/photos/' . $filename;

        // Copy to root storage for hosting compatibility
        try {
            $rootStorageDir = dirname(base_path()) . '/public_html/storage/photos';
            if (!File::exists($rootStorageDir)) {
                File::makeDirectory($rootStorageDir, 0755, true);
            }
            File::copy($publicDir . '/' . $filename, $rootStorageDir . '/' . $filename);
        } catch (\Exception $e) {}

        // Update employee photo
        $employee->photo = $path;
        $employee->save();

        \App\Services\ActivityLogger::log('update_profile_photo', 'system', 'User updated profile photo');

        return response()->json([
            'message' => 'Foto profil berhasil diperbarui.',
            'employee' => $employee,
            'avatar_url' => url('storage/photos/' . $filename),
        ]);
    }

    /**
     * Request a password reset token using NIP or email.
     */
    public function requestPasswordReset(Request $request)
    {
        $validated = $request->validate([
            'identifier' => 'required|string',
        ]);

        $identifier = trim($validated['identifier']);

        $user = User::where('nip', $identifier)
            ->orWhere('email', $identifier)
            ->first();

        if (!$user) {
            return response()->json([
                'message' => 'Akun tidak ditemukan.',
            ], 404);
        }

        $plainToken = Str::random(64);
        $hashedToken = Hash::make($plainToken);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $identifier],
            ['token' => $hashedToken, 'created_at' => Carbon::now()]
        );

        return response()->json([
            'message' => 'Token reset berhasil dibuat.',
            'reset_token' => $plainToken,
            'identifier' => $identifier,
            'expires_in_minutes' => 30,
        ]);
    }

    /**
     * Reset password using token.
     */
    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'identifier' => 'required|string',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $identifier = trim($validated['identifier']);

        $record = DB::table('password_reset_tokens')
            ->where('email', $identifier)
            ->first();

        if (!$record) {
            return response()->json([
                'message' => 'Token reset tidak valid.',
            ], 400);
        }

        $createdAt = $record->created_at ? Carbon::parse($record->created_at) : null;
        if ($createdAt && $createdAt->addMinutes(30)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $identifier)->delete();
            return response()->json([
                'message' => 'Token reset telah kedaluwarsa.',
            ], 400);
        }

        if (!Hash::check($validated['token'], $record->token)) {
            return response()->json([
                'message' => 'Token reset tidak valid.',
            ], 400);
        }

        $user = User::where('nip', $identifier)
            ->orWhere('email', $identifier)
            ->first();

        if (!$user) {
            return response()->json([
                'message' => 'Akun tidak ditemukan.',
            ], 404);
        }

        $user->password = Hash::make($validated['password']);
        $user->save();

        DB::table('password_reset_tokens')->where('email', $identifier)->delete();

        return response()->json([
            'message' => 'Kata sandi berhasil diperbarui.',
        ]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(User::all());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nip' => 'required|unique:users,nip',
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'password' => 'required|string|min:8',
            'phone_number' => 'nullable|string|max:15',
            'base_role' => 'required|in:admin,operator,validator',
        ]);

        $validated['password'] = Hash::make($validated['password']);

        $user = User::create($validated);

        return response()->json($user, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $user = User::findOrFail($id);
        return response()->json($user);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'nip' => 'required|unique:users,nip,'.$id,
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'password' => 'nullable|string|min:8',
            'phone_number' => 'nullable|string|max:15',
            'base_role' => 'required|in:admin,operator,validator',
        ]);

        if ($request->filled('password')) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']); // Don't update password if not provided
        }

        $user->update($validated);

        return response()->json($user);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }
}
