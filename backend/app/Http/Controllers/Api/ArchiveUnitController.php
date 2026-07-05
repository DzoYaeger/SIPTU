<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ArchiveUnit;
use App\Models\ArchiveUnitSetting;
use Illuminate\Http\Request;

class ArchiveUnitController extends Controller
{
    public function index()
    {
        $units = ArchiveUnit::orderBy('fungsi_bidang')
            ->get()
            ->map(function ($unit) {
                return [
                    'id' => $unit->id,
                    'nama' => str_ireplace('keasipan', 'kearsipan', $unit->fungsi_bidang),
                    'fungsi_bidang' => str_ireplace('keasipan', 'kearsipan', $unit->fungsi_bidang),
                    'unit_pengolah_employee_ids' => $unit->unit_pengolah_employee_ids ?? [],
                ];
            });

        $setting = ArchiveUnitSetting::first();

        return response()->json([
            'units' => $units,
            'unit_kearsipan_employee_ids' => $setting?->unit_keasipan_employee_ids ?? [],
            'unit_keasipan_employee_ids' => $setting?->unit_keasipan_employee_ids ?? [],
        ]);
    }
}
