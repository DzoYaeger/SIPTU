<?php

namespace App\Http\Controllers\Api;

use App\Models\ArchiveUnit;
use App\Models\Letter;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Storage;
use Barryvdh\DomPDF\Facade\Pdf;

class LetterController extends Controller
{
    public function serveFile(string $id, string $kind)
    {
        $letter = Letter::findOrFail($id);

        $path = match ($kind) {
            'surat' => $letter->file_surat,
            'bukti' => $letter->bukti_kirim,
            default => null,
        };

        if (!$path || !Storage::disk('public')->exists($path)) {
            return response()->json(['message' => 'File tidak ditemukan.'], 404);
        }

        return Storage::disk('public')->response($path);
    }

    public function index(Request $request)
    {
        $roleInfo = $this->getUserArchiveRole();
        if ($roleInfo['role'] === 'none') {
            return response()->json(['data' => []]);
        }

        $type          = $request->query('type', 'masuk');
        // 'all', 'uk', or specific unit ID
        $archiveUnitId = $request->query('archive_unit_id');

        $query = Letter::where('type', $type);

        if ($roleInfo['role'] === 'uk') {
            if ($archiveUnitId === 'uk') {
                $query->whereNull('archive_unit_id');
            } elseif ($archiveUnitId && $archiveUnitId !== 'all') {
                $query->where('archive_unit_id', $archiveUnitId);
            }
        } elseif ($roleInfo['role'] === 'up') {
            $query->where('archive_unit_id', $roleInfo['unit_id']);
        }

        $letters = $query->orderByDesc('id')
            ->get()
            ->map(fn ($l) => $this->format($l));

        return response()->json(['data' => $letters]);
    }

    public function exportPdf(Request $request)
    {
        $roleInfo = $this->getUserArchiveRole();
        if ($roleInfo['role'] === 'none') {
            abort(403, 'Unauthorized');
        }

        $type          = $request->query('type', 'masuk');
        $archiveUnitId = $request->query('archive_unit_id');
        $search        = $request->query('search');

        $query = Letter::where('type', $type);

        if ($roleInfo['role'] === 'uk') {
            if ($archiveUnitId === 'uk') {
                $query->whereNull('archive_unit_id');
            } elseif ($archiveUnitId && $archiveUnitId !== 'all') {
                $query->where('archive_unit_id', $archiveUnitId);
            }
        } elseif ($roleInfo['role'] === 'up') {
            $query->where('archive_unit_id', $roleInfo['unit_id']);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('nomor_surat', 'like', "%$search%")
                  ->orWhere('hal', 'like', "%$search%")
                  ->orWhere('instansi_pengirim', 'like', "%$search%")
                  ->orWhere('penerima', 'like', "%$search%")
                  ->orWhere('tujuan', 'like', "%$search%")
                  ->orWhere('pengirim', 'like', "%$search%");
            });
        }

        $letters = $query->orderByDesc('id')->get();
        
        $unitName = 'Semua Unit';
        if ($archiveUnitId === 'uk') {
            $unitName = 'Unit Kearsipan';
        } elseif ($archiveUnitId && $archiveUnitId !== 'all') {
            $unit = ArchiveUnit::find($archiveUnitId);
            $unitName = $unit ? $unit->fungsi_bidang : 'Unit Tidak Diketahui';
        } elseif ($roleInfo['role'] === 'up') {
            $unit = ArchiveUnit::find($roleInfo['unit_id']);
            $unitName = $unit ? $unit->fungsi_bidang : 'Unit Pengolah';
        }

        $data = [
            'type'      => $type,
            'unitName'  => $unitName,
            'letters'   => $letters,
            'date'      => now()->format('d/m/Y'),
        ];

        $pdf = Pdf::loadView('pdf.letters_report', $data)
                  ->setPaper('a4', 'landscape');

        $filename = 'Laporan_Surat_' . ucfirst($type) . '_' . str_replace(' ', '_', $unitName) . '_' . now()->format('YmdHis') . '.pdf';

        return $pdf->download($filename);
    }

    public function store(Request $request)
    {
        $roleInfo = $this->getUserArchiveRole();
        if ($roleInfo['role'] === 'none') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Frontend may send 'uk' to represent Unit Kearsipan bucket.
        if ($request->input('archive_unit_id') === 'uk') {
            $request->merge(['archive_unit_id' => null]);
        }

        $data = $request->validate([
            'type'               => 'required|in:masuk,keluar',
            'archive_unit_id'    => 'nullable|integer|exists:archive_units,id',
            'nomor_surat'        => 'nullable|string|max:100',
            'hal'                => 'nullable|string|max:255',
            'tanggal_surat'      => 'nullable|date',
            'instansi_pengirim'  => 'nullable|string|max:255',
            'penerima'           => 'nullable|string|max:255',
            'tanggal_terima'     => 'nullable|date',
            'tujuan'             => 'nullable|string|max:255',
            'pengirim'           => 'nullable|string|max:255',
            'tanggal_kirim'      => 'nullable|date',
        ]);

        if ($roleInfo['role'] === 'up') {
            $data['archive_unit_id'] = $roleInfo['unit_id'];
        } elseif ($roleInfo['role'] === 'uk') {
            // UK can save to own bucket (null) or specific UP.
            $data['archive_unit_id'] = $request->input('archive_unit_id');
        }

        $letter = Letter::create($data);
        return response()->json(['data' => $this->format($letter)], 201);
    }

    public function update(Request $request, $id)
    {
        $roleInfo = $this->getUserArchiveRole();
        if ($roleInfo['role'] === 'none') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($request->input('archive_unit_id') === 'uk') {
            $request->merge(['archive_unit_id' => null]);
        }

        $letter = Letter::findOrFail($id);

        if ($roleInfo['role'] === 'up' && $letter->archive_unit_id !== $roleInfo['unit_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'archive_unit_id'   => 'nullable|integer|exists:archive_units,id',
            'nomor_surat'       => 'nullable|string|max:100',
            'hal'               => 'nullable|string|max:255',
            'tanggal_surat'     => 'nullable|date',
            'instansi_pengirim' => 'nullable|string|max:255',
            'penerima'          => 'nullable|string|max:255',
            'tanggal_terima'    => 'nullable|date',
            'tujuan'            => 'nullable|string|max:255',
            'pengirim'          => 'nullable|string|max:255',
            'tanggal_kirim'     => 'nullable|date',
        ]);

        if ($roleInfo['role'] === 'up') {
            $data['archive_unit_id'] = $roleInfo['unit_id'];
        } elseif ($roleInfo['role'] === 'uk') {
            $data['archive_unit_id'] = $request->input('archive_unit_id');
        }

        $letter->update($data);
        return response()->json(['data' => $this->format($letter->fresh())]);
    }

    public function destroy($id)
    {
        $roleInfo = $this->getUserArchiveRole();
        if ($roleInfo['role'] === 'none') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $letter = Letter::findOrFail($id);

        if ($roleInfo['role'] === 'up' && $letter->archive_unit_id !== $roleInfo['unit_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($letter->bukti_kirim) {
            Storage::disk('public')->delete($letter->bukti_kirim);
        }

        $letter->delete();
        return response()->json(['message' => 'Surat berhasil dihapus.']);
    }

    public function uploadFileSurat(Request $request, $id)
    {
        $roleInfo = $this->getUserArchiveRole();
        $letter = Letter::findOrFail($id);

        if ($roleInfo['role'] === 'none' || ($roleInfo['role'] === 'up' && $letter->archive_unit_id !== $roleInfo['unit_id'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate(['file' => 'required|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:1024']);
        if ($letter->file_surat) Storage::disk('public')->delete($letter->file_surat);
        $path = $request->file('file')->store('surat-masuk', 'public');
        $letter->update(['file_surat' => $path]);

        return response()->json(['data' => $this->format($letter->fresh()), 'message' => 'File surat berhasil diunggah.']);
    }

    public function uploadBukti(Request $request, $id)
    {
        $roleInfo = $this->getUserArchiveRole();
        $letter = Letter::findOrFail($id);

        if ($roleInfo['role'] === 'none' || ($roleInfo['role'] === 'up' && $letter->archive_unit_id !== $roleInfo['unit_id'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate(['file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:1024']);
        if ($letter->bukti_kirim) Storage::disk('public')->delete($letter->bukti_kirim);
        $path = $request->file('file')->store('bukti-kirim', 'public');
        $letter->update(['bukti_kirim' => $path]);

        return response()->json(['data' => $this->format($letter->fresh()), 'message' => 'Bukti kirim berhasil diunggah.']);
    }

    /** Daftar semua UP/UK (non-admin endpoint) */
    public function units()
    {
        $roleInfo = $this->getUserArchiveRole();

        $units = ArchiveUnit::orderBy('fungsi_bidang')
            ->get()
            ->map(fn ($u) => [
                'id'   => $u->id,
                'nama' => str_ireplace('keasipan', 'kearsipan', $u->fungsi_bidang),
            ]);

        return response()->json([
            'data'         => $units,
            'user_role'    => $roleInfo['role'],
            'user_unit_id' => $roleInfo['unit_id'],
        ]);
    }

    private function getUserArchiveRole(): array
    {
        $user = auth()->guard('sanctum')->user();
        if (!$user) return ['role' => 'none', 'unit_id' => null];

        // Ensure we check employee relations if needed
        $employeeId = $user->employee_id ?? $user->employee?->id; // depending on structure
        
        // If we don't have employee data on the user model directly, find it by nip matching
        if (!$employeeId && $user->nip) {
            $emp = \App\Models\Employee::where('nip', $user->nip)->first();
            $employeeId = $emp?->id;
        }

        if (!$employeeId) {
            return ['role' => 'none', 'unit_id' => null];
        }

        // Check if user is Unit Kearsipan (UK)
        $setting = \App\Models\ArchiveUnitSetting::first();
        if ($setting) {
            if ($setting->unit_keasipan_employee_id == $employeeId ||
                in_array($employeeId, $setting->unit_keasipan_employee_ids ?? [])) {
                return ['role' => 'uk', 'unit_id' => null];
            }
        }

        // Check if user is Unit Pengolah (UP)
        $units = ArchiveUnit::all();
        foreach ($units as $unit) {
            if ($unit->unit_pengolah_employee_id == $employeeId ||
                in_array($employeeId, $unit->unit_pengolah_employee_ids ?? [])) {
                return ['role' => 'up', 'unit_id' => $unit->id];
            }
        }

        return ['role' => 'none', 'unit_id' => null];
    }

    private function format(Letter $letter): array
    {
        return [
            'id'                => $letter->id,
            'type'              => $letter->type,
            'archive_unit_id'   => $letter->archive_unit_id,
            'nomor_surat'       => $letter->nomor_surat,
            'hal'               => $letter->hal,
            'tanggal_surat'     => $letter->tanggal_surat?->format('Y-m-d'),
            'instansi_pengirim' => $letter->instansi_pengirim,
            'penerima'          => $letter->penerima,
            'tanggal_terima'    => $letter->tanggal_terima?->format('Y-m-d'),
            'file_surat_url'    => $letter->file_surat
                ? $this->fileProxyUrl($letter->id, 'surat')
                : null,
            'tujuan'            => $letter->tujuan,
            'pengirim'          => $letter->pengirim,
            'tanggal_kirim'     => $letter->tanggal_kirim?->format('Y-m-d'),
            'bukti_kirim_url'   => $letter->bukti_kirim
                ? $this->fileProxyUrl($letter->id, 'bukti')
                : null,
        ];
    }

    private function fileProxyUrl(int $letterId, string $kind): string
    {
        $host = request()->getSchemeAndHttpHost();
        return $host . '/api/public/letters/files/' . $letterId . '/' . $kind;
    }
}
