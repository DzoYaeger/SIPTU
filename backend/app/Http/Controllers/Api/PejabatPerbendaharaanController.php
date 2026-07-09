<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PejabatPerbendaharaan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PejabatPerbendaharaanController extends Controller
{
    public function show()
    {
        $setting = PejabatPerbendaharaan::with(['bendahara', 'ppk'])->first();

        return response()->json([
            'setting' => $setting
        ]);
    }

    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'bendahara_id' => 'nullable|exists:employees,id',
            'ppk_id' => 'nullable|exists:employees,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors()
            ], 422);
        }

        $setting = PejabatPerbendaharaan::firstOrNew();
        $setting->bendahara_id = $request->bendahara_id;
        $setting->ppk_id = $request->ppk_id;
        $setting->save();

        // Reload relationships
        $setting->load(['bendahara', 'ppk']);

        return response()->json([
            'message' => 'Pejabat perbendaharaan berhasil diperbarui.',
            'setting' => $setting
        ]);
    }
}
