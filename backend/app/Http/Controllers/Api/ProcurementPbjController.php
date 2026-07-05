<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProcurementPbj;
use Illuminate\Http\Request;

class ProcurementPbjController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $procurements = ProcurementPbj::orderBy('created_at', 'desc')->get();
        return response()->json(['data' => $procurements]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Only admin can store
        if ($request->user() && $request->user()->base_role !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'nama_pengadaan' => 'nullable|string|max:255',
            'jenis_pengadaan' => 'nullable|in:Langsung,E-Purchasing',
            'nama_penyedia' => 'nullable|string|max:255',
            'tanggal_pengadaan' => 'nullable|date',
            'no_kontrak' => 'nullable|string|max:255',
            'nominal' => 'nullable|numeric',
            'tanggal_kirim' => 'nullable|date',
            'tanggal_sampai' => 'nullable|date',
            'no_bast' => 'nullable|string|max:255',
            'tanggal_bast' => 'nullable|date',
            'status_barang' => 'required|in:Proses Negosiasi,Proses PPK,Proses pengiriman,Proses Pembayaran,Selesai',
        ]);

        $procurement = ProcurementPbj::create($validated);

        return response()->json(['message' => 'Data PBJ berhasil ditambahkan.', 'data' => $procurement], 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        // Only admin can update
        if ($request->user() && $request->user()->base_role !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $procurement = ProcurementPbj::findOrFail($id);

        $validated = $request->validate([
            'nama_pengadaan' => 'nullable|string|max:255',
            'jenis_pengadaan' => 'nullable|in:Langsung,E-Purchasing',
            'nama_penyedia' => 'nullable|string|max:255',
            'tanggal_pengadaan' => 'nullable|date',
            'no_kontrak' => 'nullable|string|max:255',
            'nominal' => 'nullable|numeric',
            'tanggal_kirim' => 'nullable|date',
            'tanggal_sampai' => 'nullable|date',
            'no_bast' => 'nullable|string|max:255',
            'tanggal_bast' => 'nullable|date',
            'status_barang' => 'required|in:Proses Negosiasi,Proses PPK,Proses pengiriman,Proses Pembayaran,Selesai',
        ]);

        $procurement->update($validated);

        return response()->json(['message' => 'Data PBJ berhasil diperbarui.', 'data' => $procurement]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, $id)
    {
        // Only admin can destroy
        if ($request->user() && $request->user()->base_role !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $procurement = ProcurementPbj::findOrFail($id);
        $procurement->delete();

        return response()->json(['message' => 'Data PBJ berhasil dihapus.']);
    }
}
