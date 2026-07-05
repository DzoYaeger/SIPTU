<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Asset;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;

class AssetController extends Controller
{
    /**
     * Download BMN assets import template (xlsx).
     */
    public function template()
    {
        $path = storage_path('app/templates/bmn_assets_template.xlsx');
        if (!file_exists($path)) {
            return response()->json(['message' => 'Template file not found.'], 404);
        }

        return response()->download($path, 'bmn_assets_template.xlsx');
    }

    /**
     * Import BMN assets from XLSX/CSV template.
     */
    public function import(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $file = $request->file('file');
        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, true);

        if (!$rows || count($rows) < 2) {
            return response()->json(['message' => 'File tidak memiliki data untuk diimpor.'], 422);
        }

        $headerRow = array_shift($rows);
        $headerMap = [];
        foreach ($headerRow as $column => $header) {
            if ($header === null) {
                continue;
            }
            $normalized = strtolower(trim((string) $header));
            $normalized = preg_replace('/\s+/', '_', $normalized);
            $headerMap[$column] = $normalized;
        }

        $requiredColumns = ['kode_bmn', 'nup', 'nama_barang', 'merek_barang'];
        $missing = array_diff($requiredColumns, array_values($headerMap));
        if (!empty($missing)) {
            return response()->json([
                'message' => 'Header kolom tidak sesuai template.',
                'missing' => array_values($missing),
            ], 422);
        }

        $imported = 0;
        $skipped = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            $payload = [];
            foreach ($headerMap as $column => $key) {
                $payload[$key] = $row[$column] ?? null;
            }

            $isEmpty = true;
            foreach ($requiredColumns as $key) {
                if (!empty($payload[$key])) {
                    $isEmpty = false;
                    break;
                }
            }
            if ($isEmpty) {
                $skipped++;
                continue;
            }

            $rowNumber = $index + 2;
            foreach ($requiredColumns as $key) {
                if (empty($payload[$key])) {
                    $errors[] = "Baris {$rowNumber}: kolom {$key} wajib diisi.";
                    continue 2;
                }
            }

            $statusRaw = strtolower(trim((string) ($payload['status'] ?? '')));
            $status = match ($statusRaw) {
                'available', 'tersedia' => 'tersedia',
                'loaned', 'dipinjam' => 'dipinjam',
                'maintenance', 'perbaikan', 'rusak' => 'rusak',
                'lost', 'hilang' => 'hilang',
                default => 'tersedia',
            };

            Asset::create([
                'name' => (string) $payload['nama_barang'],
                'category' => 'BMN',
                'quantity' => 1,
                'location' => 'BMN',
                'status' => $status,
                'asset_code' => (string) $payload['kode_bmn'],
                'brand' => (string) $payload['merek_barang'],
                'model' => (string) $payload['nup'],
                'description' => 'NUP: ' . (string) $payload['nup'],
                'created_by' => $request->user()->id,
            ]);

            $imported++;
        }

        return response()->json([
            'message' => 'Import selesai.',
            'imported' => $imported,
            'skipped' => $skipped,
            'errors' => $errors,
        ]);
    }
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Asset::query();

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('category', 'LIKE', "%{$search}%")
                  ->orWhere('location', 'LIKE', "%{$search}%");
            });
        }

        // Filtering by category
        if ($request->has('category') && $request->category) {
            $query->where('category', $request->category);
        }

        // Filtering by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Pagination
        $page = $request->get('page', 1);
        $pageSize = $request->get('pageSize', 10);

        $assets = $query->paginate($pageSize, ['*'], 'page', $page);

        return response()->json([
            'data' => $assets->items(),
            'meta' => [
                'total' => $assets->total(),
                'page' => $assets->currentPage(),
                'last_page' => $assets->lastPage(),
            ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'quantity' => 'required|integer|min:1',
            'location' => 'required|string|max:255',
            'asset_code' => 'nullable|string|max:100|unique:assets,asset_code',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'year_of_purchase' => 'nullable|integer|min:1900|max:' . date('Y'),
            'purchase_price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'condition' => 'nullable|in:baru,bekas,rusak',
            'warranty_expiry' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validated = $validator->validated();
        $asset = Asset::create(array_merge(
            $validated,
            ['created_by' => auth()->id()]
        ));

        \App\Services\ActivityLogger::log('create', 'bmn', "Menambahkan aset BMN: {$asset->name} ({$asset->asset_code})", null, $asset);

        return response()->json($asset, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $asset = Asset::findOrFail($id);
        return response()->json($asset);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $asset = Asset::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'quantity' => 'required|integer|min:1',
            'location' => 'required|string|max:255',
            'asset_code' => 'nullable|string|max:100|unique:assets,asset_code,' . $id,
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'year_of_purchase' => 'nullable|integer|min:1900|max:' . date('Y'),
            'purchase_price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'status' => 'nullable|in:tersedia,dipinjam,rusak,hilang',
            'condition' => 'nullable|in:baru,bekas,rusak',
            'warranty_expiry' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validated = $validator->validated();
        $asset->update($validated);

        \App\Services\ActivityLogger::log('update', 'bmn', "Mengubah aset BMN: {$asset->name} ({$asset->asset_code})", null, $asset);

        return response()->json($asset);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $asset = Asset::findOrFail($id);
        $assetCode = $asset->asset_code; // Capture asset_code before deletion
        $assetName = $asset->name; // Capture asset name before deletion
        $asset->delete();

        \App\Services\ActivityLogger::log('delete', 'bmn', "Menghapus aset BMN: {$assetName} ({$assetCode})");

        return response()->json(['message' => 'Asset deleted successfully']);
    }
}
