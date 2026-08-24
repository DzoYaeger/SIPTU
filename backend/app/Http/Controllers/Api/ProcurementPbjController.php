<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProcurementPbj;
use App\Services\NextcloudService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProcurementPbjController extends Controller
{
    private NextcloudService $nextcloudService;

    public function __construct(NextcloudService $nextcloudService)
    {
        $this->nextcloudService = $nextcloudService;
    }

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
            'items' => 'nullable',
            'file_surat_pesanan' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:25600',
            'file_bast' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:25600',
            'file_invoice' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:25600',
        ]);

        if ($request->has('items')) {
            $rawItems = $request->input('items');
            if (is_string($rawItems)) {
                $validated['items'] = json_decode($rawItems, true) ?: [];
            } elseif (is_array($rawItems)) {
                $validated['items'] = $rawItems;
            }
        }

        foreach (['file_surat_pesanan', 'file_bast', 'file_invoice'] as $fileKey) {
            if ($request->hasFile($fileKey)) {
                $validated[$fileKey] = $this->nextcloudService->uploadFile(
                    $request->file($fileKey),
                    'SIPTU PBJ',
                    $fileKey
                );
            } else {
                unset($validated[$fileKey]);
            }
        }

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
            'items' => 'nullable',
            'file_surat_pesanan' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:25600',
            'file_bast' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:25600',
            'file_invoice' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:25600',
        ]);

        if ($request->has('items')) {
            $rawItems = $request->input('items');
            if (is_string($rawItems)) {
                $validated['items'] = json_decode($rawItems, true) ?: [];
            } elseif (is_array($rawItems)) {
                $validated['items'] = $rawItems;
            }
        }

        foreach (['file_surat_pesanan', 'file_bast', 'file_invoice'] as $fileKey) {
            if ($request->hasFile($fileKey)) {
                if (!empty($procurement->$fileKey)) {
                    if (str_starts_with($procurement->$fileKey, 'procurement-pbj/')) {
                        Storage::disk('public')->delete($procurement->$fileKey);
                    } else {
                        $this->nextcloudService->deleteFile($procurement->$fileKey);
                    }
                }
                $validated[$fileKey] = $this->nextcloudService->uploadFile(
                    $request->file($fileKey),
                    'SIPTU PBJ',
                    $fileKey
                );
            } elseif ($request->has('remove_' . $fileKey) && $request->boolean('remove_' . $fileKey)) {
                if (!empty($procurement->$fileKey)) {
                    if (str_starts_with($procurement->$fileKey, 'procurement-pbj/')) {
                        Storage::disk('public')->delete($procurement->$fileKey);
                    } else {
                        $this->nextcloudService->deleteFile($procurement->$fileKey);
                    }
                }
                $validated[$fileKey] = null;
            } else {
                unset($validated[$fileKey]);
            }
        }

        $procurement->update($validated);

        return response()->json(['message' => 'Data PBJ berhasil diperbarui.', 'data' => $procurement]);
    }

    /**
     * Stream or view Nextcloud file for PBJ item.
     */
    public function viewFile(Request $request, $id, $fileType)
    {
        $procurement = ProcurementPbj::findOrFail($id);

        $column = match (strtolower($fileType)) {
            'sp', 'file_surat_pesanan' => 'file_surat_pesanan',
            'bast', 'file_bast' => 'file_bast',
            'inv', 'invoice', 'file_invoice' => 'file_invoice',
            default => null,
        };

        if (!$column || empty($procurement->$column)) {
            return response()->json(['message' => 'Berkas tidak ditemukan.'], 404);
        }

        $filePath = $procurement->$column;

        // Legacy local storage fallback
        if (str_starts_with($filePath, 'procurement-pbj/')) {
            if (Storage::disk('public')->exists($filePath)) {
                return Storage::disk('public')->response($filePath);
            }
        }

        $inline = $request->query('download') !== '1';
        return $this->nextcloudService->streamFile($filePath, $inline);
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
        foreach (['file_surat_pesanan', 'file_bast', 'file_invoice'] as $fileKey) {
            if (!empty($procurement->$fileKey)) {
                if (str_starts_with($procurement->$fileKey, 'procurement-pbj/')) {
                    Storage::disk('public')->delete($procurement->$fileKey);
                } else {
                    $this->nextcloudService->deleteFile($procurement->$fileKey);
                }
            }
        }
        $procurement->delete();

        return response()->json(['message' => 'Data PBJ berhasil dihapus.']);
    }
}
