<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Employee;
use App\Models\KgbRecord;
use Illuminate\Support\Facades\Validator;

class KgbController extends Controller
{
    /**
     * Display a listing of KGB records for a specific employee.
     */
    public function index($employeeId)
    {
        $employee = Employee::findOrFail($employeeId);
        $kgbRecords = $employee->kgbRecords()->orderBy('tmt_sk', 'desc')->get();
        
        return response()->json([
            'data' => $kgbRecords
        ]);
    }

    /**
     * Store a newly created KGB record for an employee.
     */
    public function store(Request $request, $employeeId)
    {
        $employee = Employee::findOrFail($employeeId);

        $validator = Validator::make($request->all(), [
            'nomor_sk' => 'required|string|max:255',
            'tanggal_sk' => 'required|date',
            'tmt_sk' => 'required|date',
            'lama_kerja_tahun' => 'required|integer|min:0|max:60',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $kgbRecord = $employee->kgbRecords()->create($validator->validated());

        return response()->json([
            'message' => 'KGB record created successfully',
            'data' => $kgbRecord
        ], 201);
    }

    /**
     * Display the specified KGB record.
     */
    public function show($employeeId, $id)
    {
        $employee = Employee::findOrFail($employeeId);
        $kgbRecord = $employee->kgbRecords()->findOrFail($id);
        
        return response()->json([
            'data' => $kgbRecord
        ]);
    }

    /**
     * Update the specified KGB record.
     */
    public function update(Request $request, $employeeId, $id)
    {
        $employee = Employee::findOrFail($employeeId);
        $kgbRecord = $employee->kgbRecords()->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'nomor_sk' => 'required|string|max:255',
            'tanggal_sk' => 'required|date',
            'tmt_sk' => 'required|date',
            'lama_kerja_tahun' => 'required|integer|min:0|max:60',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $kgbRecord->update($validator->validated());

        return response()->json([
            'message' => 'KGB record updated successfully',
            'data' => $kgbRecord
        ]);
    }

    /**
     * Remove the specified KGB record.
     */
    public function destroy($employeeId, $id)
    {
        $employee = Employee::findOrFail($employeeId);
        $kgbRecord = $employee->kgbRecords()->findOrFail($id);
        
        $kgbRecord->delete();

        return response()->json([
            'message' => 'KGB record deleted successfully'
        ]);
    }
}