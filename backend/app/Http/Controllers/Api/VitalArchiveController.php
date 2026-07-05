<?php

namespace App\Http\Controllers\Api;

use App\Models\ArchiveUnit;
use App\Models\VitalArchive;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Barryvdh\DomPDF\Facade\Pdf;

class VitalArchiveController extends Controller
{
    public function index(Request $request)
    {
        $roleInfo = $this->getUserArchiveRole();
        if ($roleInfo['role'] === 'none') {
            return response()->json(['data' => []]);
        }

        $archiveUnitId = $request->query('archive_unit_id');
        $search        = $request->query('search');

        $query = VitalArchive::with('archiveUnit');

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
                $q->where('jenis_arsip', 'like', "%$search%")
                  ->orWhere('kurun_waktu', 'like', "%$search%")
                  ->orWhere('lokasi_simpan', 'like', "%$search%");
            });
        }

        $archives = $query->orderByDesc('id')
            ->get()
            ->map(fn ($a) => $this->format($a));

        return response()->json(['data' => $archives]);
    }

    public function exportPdf(Request $request)
    {
        $roleInfo = $this->getUserArchiveRole();
        if ($roleInfo['role'] === 'none') {
            abort(403);
        }

        $archiveUnitId = $request->query('archive_unit_id');
        $search        = $request->query('search');

        $query = VitalArchive::with('archiveUnit');

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
                $q->where('jenis_arsip', 'like', "%$search%")
                  ->orWhere('kurun_waktu', 'like', "%$search%")
                  ->orWhere('lokasi_simpan', 'like', "%$search%");
            });
        }

        $archives = $query->orderByDesc('id')
            ->get()
            ->map(fn ($a) => $this->format($a));

        $unitName = 'Semua Unit';
        if ($archiveUnitId === 'uk') {
            $unitName = 'Unit Kearsipan';
        } elseif ($archiveUnitId && $archiveUnitId !== 'all') {
            $unit = ArchiveUnit::find($archiveUnitId);
            $unitName = $unit ? str_ireplace('keasipan', 'kearsipan', $unit->fungsi_bidang) : 'Unknown Unit';
        } elseif ($roleInfo['role'] === 'up') {
            $unit = ArchiveUnit::find($roleInfo['unit_id']);
            $unitName = $unit ? str_ireplace('keasipan', 'kearsipan', $unit->fungsi_bidang) : 'Unit Pengolah';
        }

        $pdf = Pdf::loadView('pdf.vital_archives_report', [
            'data'     => $archives,
            'unitName' => $unitName,
            'date'     => now()->translatedFormat('d F Y'),
        ]);

        $pdf->setPaper('a4', 'landscape');

        return $pdf->download('Laporan_Arsip_Vital_' . now()->format('Ymd_His') . '.pdf');
    }

    public function store(Request $request)
    {
        $roleInfo = $this->getUserArchiveRole();
        if ($roleInfo['role'] === 'none') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($request->input('archive_unit_id') === 'uk') {
            $request->merge(['archive_unit_id' => null]);
        }

        $data = $request->validate([
            'jenis_arsip'         => 'required|string|max:255',
            'archive_unit_id'      => 'nullable|integer|exists:archive_units,id',
            'kurun_waktu'         => 'required|string|max:255',
            'media'               => 'required|string|max:100',
            'jumlah'              => 'required|string|max:100',
            'jangka_simpan'       => 'required|string|max:100',
            'metode_perlindungan' => 'required|string|max:100',
            'lokasi_simpan'       => 'required|string|max:255',
        ]);

        if ($roleInfo['role'] === 'up') {
            $data['archive_unit_id'] = $roleInfo['unit_id'];
        }

        $archive = VitalArchive::create($data);
        return response()->json(['data' => $this->format($archive->load('archiveUnit'))], 201);
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

        $archive = VitalArchive::findOrFail($id);

        if ($roleInfo['role'] === 'up' && $archive->archive_unit_id !== $roleInfo['unit_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'jenis_arsip'         => 'required|string|max:255',
            'archive_unit_id'      => 'nullable|integer|exists:archive_units,id',
            'kurun_waktu'         => 'required|string|max:255',
            'media'               => 'required|string|max:100',
            'jumlah'              => 'required|string|max:100',
            'jangka_simpan'       => 'required|string|max:100',
            'metode_perlindungan' => 'required|string|max:100',
            'lokasi_simpan'       => 'required|string|max:255',
        ]);

        if ($roleInfo['role'] === 'up') {
            $data['archive_unit_id'] = $roleInfo['unit_id'];
        }

        $archive->update($data);
        return response()->json(['data' => $this->format($archive->fresh('archiveUnit'))]);
    }

    public function destroy($id)
    {
        $roleInfo = $this->getUserArchiveRole();
        if ($roleInfo['role'] === 'none') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $archive = VitalArchive::findOrFail($id);

        if ($roleInfo['role'] === 'up' && $archive->archive_unit_id !== $roleInfo['unit_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $archive->delete();
        return response()->json(['message' => 'Data arsip vital berhasil dihapus.']);
    }

    private function getUserArchiveRole(): array
    {
        $user = auth()->guard('sanctum')->user();
        if (!$user) return ['role' => 'none', 'unit_id' => null];

        $employeeId = $user->employee_id ?? $user->employee?->id;
        if (!$employeeId && $user->nip) {
            $emp = \App\Models\Employee::where('nip', $user->nip)->first();
            $employeeId = $emp?->id;
        }

        if (!$employeeId) return ['role' => 'none', 'unit_id' => null];

        $setting = \App\Models\ArchiveUnitSetting::first();
        if ($setting && (in_array($employeeId, $setting->unit_keasipan_employee_ids ?? []))) {
            return ['role' => 'uk', 'unit_id' => null];
        }

        $units = ArchiveUnit::all();
        foreach ($units as $unit) {
            if (in_array($employeeId, $unit->unit_pengolah_employee_ids ?? [])) {
                return ['role' => 'up', 'unit_id' => $unit->id];
            }
        }

        return ['role' => 'none', 'unit_id' => null];
    }

    private function format(VitalArchive $archive): array
    {
        return [
            'id'                  => $archive->id,
            'jenis_arsip'         => $archive->jenis_arsip,
            'archive_unit_id'      => $archive->archive_unit_id,
            'archive_unit_nama'    => $archive->archiveUnit ? str_ireplace('keasipan', 'kearsipan', $archive->archiveUnit->fungsi_bidang) : 'Unit Kearsipan',
            'kurun_waktu'         => $archive->kurun_waktu,
            'media'               => $archive->media,
            'jumlah'              => $archive->jumlah,
            'jangka_simpan'       => $archive->jangka_simpan,
            'metode_perlindungan' => $archive->metode_perlindungan,
            'lokasi_simpan'       => $archive->lokasi_simpan,
        ];
    }
}
