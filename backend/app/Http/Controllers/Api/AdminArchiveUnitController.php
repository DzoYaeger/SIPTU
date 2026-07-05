<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ArchiveUnit;
use App\Models\ArchiveUnitSetting;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminArchiveUnitController extends Controller
{
    private const FUNGSI_OPTIONS = [
        'Tata Usaha',
        'Pemeriksaan dan Sertifikasi',
        'Infokom',
        'Penindakan',
        'Pengujian',
    ];

    public function index()
    {
        // Enforce singleton setting record
        $setting = ArchiveUnitSetting::firstOrCreate(
            ['id' => 1],
            ['unit_keasipan_employee_id' => null, 'unit_keasipan_employee_ids' => []]
        );

        $units = collect(self::FUNGSI_OPTIONS)->map(function ($fungsi) {
            return ArchiveUnit::firstOrCreate(['fungsi_bidang' => $fungsi]);
        })->values();

        $employees = Employee::select('id', 'name', 'function_area')
            ->orderBy('name')
            ->get()
            ->map(function ($employee) {
                return [
                    'id' => $employee->id,
                    'nama' => $employee->name,
                    'fungsi_bidang' => $employee->function_area,
                ];
            });

        $validEmployeeIds = $employees->pluck('id')->toArray();

        $kearsipanSingular = $setting->unit_keasipan_employee_id;
        $kearsipanMulti = $setting->unit_keasipan_employee_ids ?? [];

        return response()->json([
            'unit_keasipan_employee_id' => $setting->unit_keasipan_employee_id,
            'unit_keasipan_employee_ids' => $setting->unit_keasipan_employee_ids ?? [],
            'units' => $units->map(function ($unit) {
                return [
                    'id' => $unit->id,
                    'fungsi_bidang' => $unit->fungsi_bidang,
                    'unit_pengolah_employee_id' => $unit->unit_pengolah_employee_id,
                    'unit_pengolah_employee_ids' => $unit->unit_pengolah_employee_ids ?? [],
                ];
            }),
            'employees' => $employees,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $validator = Validator::make($request->all(), [
            'unit_pengolah_employee_id' => 'nullable|exists:employees,id',
            'unit_pengolah_employee_ids' => 'nullable|array',
            'unit_pengolah_employee_ids.*' => 'integer|exists:employees,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $unit = ctype_digit($id)
            ? ArchiveUnit::findOrFail($id)
            : ArchiveUnit::firstOrCreate(['fungsi_bidang' => $this->normalizeFungsi($id)]);

        $payload = $validator->validated();
        if (
            !array_key_exists('unit_pengolah_employee_id', $payload)
            && !array_key_exists('unit_pengolah_employee_ids', $payload)
        ) {
            return response()->json([
                'message' => 'Payload tidak valid untuk update Unit Pengolah.',
            ], 422);
        }

        if (array_key_exists('unit_pengolah_employee_ids', $payload)) {
            $unit->update([
                'unit_pengolah_employee_ids' => array_values($payload['unit_pengolah_employee_ids'] ?? []),
            ]);
        } else {
            $unit->update([
                'unit_pengolah_employee_id' => $payload['unit_pengolah_employee_id'] ?? null,
            ]);
        }

        $unit = $unit->fresh();

        return response()->json([
            'id' => $unit->id,
            'fungsi_bidang' => $this->normalizeFungsi($unit->fungsi_bidang),
            'unit_pengolah_employee_id' => $unit->unit_pengolah_employee_id,
            'unit_pengolah_employee_ids' => $unit->unit_pengolah_employee_ids ?? [],
        ]);
    }

    public function updateKearsipan(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'unit_keasipan_employee_id' => 'nullable|exists:employees,id',
            'unit_keasipan_employee_ids' => 'nullable|array',
            'unit_keasipan_employee_ids.*' => 'integer|exists:employees,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $payload = $validator->validated();
        
        $updateData = [];
        if (array_key_exists('unit_keasipan_employee_ids', $payload)) {
             \Illuminate\Support\Facades\Log::info('Saving Unit Kearsipan IDs', ['ids' => $payload['unit_keasipan_employee_ids']]);
             $updateData['unit_keasipan_employee_ids'] = array_values($payload['unit_keasipan_employee_ids'] ?? []);
        }
        if (array_key_exists('unit_keasipan_employee_id', $payload)) {
             \Illuminate\Support\Facades\Log::info('Saving Unit Kearsipan ID', ['id' => $payload['unit_keasipan_employee_id']]);
             $updateData['unit_keasipan_employee_id'] = $payload['unit_keasipan_employee_id'] ?? null;
        }

        $setting = ArchiveUnitSetting::updateOrCreate(['id' => 1], $updateData);

        $setting = $setting->fresh();

        return response()->json([
            'unit_keasipan_employee_id' => $setting->unit_keasipan_employee_id,
            'unit_keasipan_employee_ids' => $setting->unit_keasipan_employee_ids ?? [],
        ]);
    }

    private function normalizeFungsi(string $value): string
    {
        return str_ireplace('keasipan', 'kearsipan', $value);
    }
}
