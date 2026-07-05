<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PdttAuthorizedUser;
use App\Models\NotificationSetting;
use App\Models\User;
use Illuminate\Http\Request;

class PdttAuthorizedUserController extends Controller
{
    private function getOrCreateSetting(): NotificationSetting
    {
        return NotificationSetting::firstOrCreate(
            ['id' => 1],
            [
                'fonnte_token' => null,
                'fonnte_endpoint' => 'https://api.fonnte.com/send',
                'default_admin_numbers' => [],
                'recipients' => [],
                'kgb_window' => [],
                'pdtt_service_enabled' => true,
            ]
        );
    }

    private function isAdminOrValidator($user): bool
    {
        if (!$user) {
            return false;
        }
        if (($user->base_role ?? null) === 'admin') {
            return true;
        }
        $roles = is_array($user->available_roles ?? null) ? $user->available_roles : [];
        return in_array('validator', $roles, true);
    }

    public function index(Request $request)
    {
        if (!$this->isAdminOrValidator($request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $setting = $this->getOrCreateSetting();

        $users = PdttAuthorizedUser::with('user:id,name,email,base_role')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'user_id' => $item->user_id,
                    'name' => $item->user->name ?? 'Unknown',
                    'email' => $item->user->email ?? '',
                    'role' => $item->user->base_role ?? '',
                    'jumlah_hari' => $item->jumlah_hari,
                    'saldo' => $item->jumlah_hari * 19000,
                ];
            });

        return response()->json([
            'data' => $users,
            'service_config' => [
                'pdtt_service_enabled' => (bool) $setting->pdtt_service_enabled,
            ],
        ]);
    }

    public function serviceConfig(Request $request)
    {
        $setting = $this->getOrCreateSetting();
        return response()->json([
            'pdtt_service_enabled' => (bool) $setting->pdtt_service_enabled,
        ]);
    }

    public function updateServiceConfig(Request $request)
    {
        if (!$this->isAdminOrValidator($request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $payload = $request->validate([
            'pdtt_service_enabled' => ['required', 'boolean'],
        ]);

        $setting = $this->getOrCreateSetting();
        $setting->update([
            'pdtt_service_enabled' => (bool) $payload['pdtt_service_enabled'],
        ]);

        return response()->json([
            'message' => 'Pengaturan layanan PDTT berhasil diperbarui.',
            'pdtt_service_enabled' => (bool) $setting->pdtt_service_enabled,
        ]);
    }

    public function store(Request $request)
    {
        if (!$this->isAdminOrValidator($request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $payload = $request->validate([
            'user_id' => ['required', 'exists:users,id', 'unique:pdtt_authorized_users,user_id'],
            'jumlah_hari' => ['required', 'integer', 'min:0'],
        ]);

        $item = PdttAuthorizedUser::create([
            'user_id' => $payload['user_id'],
            'jumlah_hari' => $payload['jumlah_hari'],
        ]);

        return response()->json([
            'message' => 'Pegawai berhasil ditambahkan ke daftar pengajuan PDTT.',
            'data' => $item,
        ], 201);
    }

    public function update(Request $request, string $id)
    {
        if (!$this->isAdminOrValidator($request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $item = PdttAuthorizedUser::findOrFail($id);
        $payload = $request->validate([
            'jumlah_hari' => ['required', 'integer', 'min:0'],
        ]);

        $item->update(['jumlah_hari' => $payload['jumlah_hari']]);

        return response()->json([
            'message' => 'Pengaturan pegawai berhasil diperbarui.',
            'data' => $item,
        ]);
    }

    public function destroy(Request $request, string $id)
    {
        if (!$this->isAdminOrValidator($request->user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $item = PdttAuthorizedUser::findOrFail($id);
        $item->delete();

        return response()->json([
            'message' => 'Pegawai dihapus dari hak pengajuan PDTT.',
        ]);
    }
}
