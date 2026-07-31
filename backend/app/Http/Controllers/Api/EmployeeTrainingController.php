<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeTraining;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class EmployeeTrainingController extends Controller
{
    private $spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/17TOQEsxGao969wySc21IfFIeH3TrBy2EqY9Eixr1cGE/htmlview/sheet?headers=true&gid=940931713';

    /**
     * Get paginated list of employee trainings with search & filters.
     */
    public function index(Request $request)
    {
        $query = EmployeeTraining::query();

        // Search by Nama, NIP, Judul Pelatihan, Narasumber, atau No Undangan
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                  ->orWhere('nip', 'like', "%{$search}%")
                  ->orWhere('judul_pelatihan', 'like', "%{$search}%")
                  ->orWhere('tempat_pelatihan', 'like', "%{$search}%")
                  ->orWhere('narasumber', 'like', "%{$search}%")
                  ->orWhere('no_undangan', 'like', "%{$search}%")
                  ->orWhere('dokumentasi', 'like', "%{$search}%");
            });
        }

        // Filter by Fungsi
        if ($request->filled('fungsi') && $request->input('fungsi') !== 'all') {
            $query->where('fungsi', $request->input('fungsi'));
        }

        // Filter by Progress
        if ($request->filled('progress') && $request->input('progress') !== 'all') {
            $query->where('progress', $request->input('progress'));
        }

        // Filter by NIP
        if ($request->filled('nip')) {
            $query->where('nip', $request->input('nip'));
        }

        // Filter by Diseminasi
        if ($request->filled('diseminasi')) {
            $disVal = strtolower($request->input('diseminasi'));
            if ($disVal === 'ya' || $disVal === '1' || $disVal === 'true') {
                $query->where(function ($q) {
                    $q->where('ceklis_diseminasi', true)
                      ->orWhere('akan_diseminasi', true);
                });
            }
        }

        $perPage = $request->input('pageSize', 20);
        $trainings = $query->orderBy('updated_at', 'desc')->paginate($perPage);

        $lastSynced = EmployeeTraining::max('synced_at');

        return response()->json([
            'data' => $trainings->items(),
            'total' => $trainings->total(),
            'currentPage' => $trainings->currentPage(),
            'lastPage' => $trainings->lastPage(),
            'perPage' => $trainings->perPage(),
            'last_synced_at' => $lastSynced ? Carbon::parse($lastSynced)->toISOString() : null,
        ]);
    }

    /**
     * Get statistics summary for dashboard & header widgets.
     */
    public function stats()
    {
        $total = EmployeeTraining::count();
        $selesaiPelatihan = EmployeeTraining::where('progress', 'like', '%Selesai Pelatihan%')->count();
        $selesaiDiseminasi = EmployeeTraining::where('progress', 'like', '%Selesai Diseminasi%')->count();
        $proses = EmployeeTraining::where('progress', 'like', '%Proses%')->count();
        $akanDiseminasi = EmployeeTraining::where('akan_diseminasi', true)->count();
        $ceklisDiseminasi = EmployeeTraining::where('ceklis_diseminasi', true)->count();

        $byFungsi = EmployeeTraining::selectRaw('fungsi, COUNT(*) as total')
            ->whereNotNull('fungsi')
            ->where('fungsi', '!=', '')
            ->groupBy('fungsi')
            ->get();

        $lastSynced = EmployeeTraining::max('synced_at');

        return response()->json([
            'total_pelatihan' => $total,
            'selesai_pelatihan' => $selesaiPelatihan,
            'selesai_diseminasi' => $selesaiDiseminasi,
            'proses' => $proses,
            'akan_diseminasi' => $akanDiseminasi,
            'ceklis_diseminasi' => $ceklisDiseminasi,
            'by_fungsi' => $byFungsi,
            'last_synced_at' => $lastSynced ? Carbon::parse($lastSynced)->toISOString() : null,
        ]);
    }

    /**
     * Sync data from Google Spreadsheet HTML sheet view (extracts direct Drive folder links).
     */
    public function sync(Request $request)
    {
        try {
            $response = Http::withoutVerifying()
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ])
                ->timeout(30)
                ->get($this->spreadsheetUrl);

            if (!$response->successful()) {
                return response()->json([
                    'message' => 'Gagal mengunduh spreadsheet dari Google. Status: ' . $response->status()
                ], 500);
            }

            $htmlContent = $response->body();
            if (empty(trim($htmlContent))) {
                return response()->json(['message' => 'Konten spreadsheet kosong.'], 400);
            }

            $dom = new \DOMDocument();
            @$dom->loadHTML($htmlContent);

            $rows = $dom->getElementsByTagName('tr');
            $syncedAt = Carbon::now();
            $processedCount = 0;
            $updatedCount = 0;
            $createdCount = 0;

            foreach ($rows as $tr) {
                $tds = $tr->getElementsByTagName('td');
                if ($tds->length < 4) continue;

                $rowValues = [];
                $rowLinks = [];

                foreach ($tds as $cIdx => $td) {
                    $val = trim($td->textContent);
                    $link = null;

                    $anchors = $td->getElementsByTagName('a');
                    if ($anchors->length > 0) {
                        $rawHref = $anchors->item(0)->getAttribute('href');
                        if (preg_match('/q=([^&]+)/i', $rawHref, $qm)) {
                            $link = urldecode($qm[1]);
                        } else {
                            $link = $rawHref;
                        }
                    }

                    $rowValues[$cIdx] = $val;
                    $rowLinks[$cIdx] = $link;
                }

                $noUndangan = trim($rowValues[0] ?? '');
                $judulPelatihan = trim($rowValues[1] ?? ''); // Nama Bangkom
                $tanggalPelatihan = trim($rowValues[2] ?? ''); // Tanggal SESI KOMPAK
                $narasumber = trim($rowValues[3] ?? '');
                $jumlahPeserta = trim($rowValues[4] ?? '');
                $preTest = trim($rowValues[5] ?? '');
                $postTest = trim($rowValues[6] ?? '');
                $peningkatanNilai = trim($rowValues[7] ?? '');
                $kepuasanPeserta = trim($rowValues[8] ?? '');
                $dokumentasiText = trim($rowValues[9] ?? $rowValues[10] ?? '');

                // Extract direct Google Drive link from row hyperlinks
                $dokumentasiLink = null;
                foreach ($rowLinks as $l) {
                    if ($l && (str_contains($l, 'drive.google.com') || str_contains($l, 'docs.google.com'))) {
                        $dokumentasiLink = $l;
                        break;
                    }
                }

                $hasilEvaluasi = trim($rowValues[10] ?? '');
                $keterangan = trim($rowValues[11] ?? '');

                // Skip header and empty rows
                if (empty($judulPelatihan) || strtolower($judulPelatihan) === 'nama bangkom' || empty($noUndangan) || strtolower($noUndangan) === 'no undangan') {
                    continue;
                }

                // Skip DIV/0 error rows
                if (str_contains($peningkatanNilai, '#DIV') || str_contains($kepuasanPeserta, '#DIV')) {
                    continue;
                }

                $finalDokumentasi = $dokumentasiLink ?: $dokumentasiText;
                $rawHash = md5(json_encode([$noUndangan, $judulPelatihan, $tanggalPelatihan, $narasumber, $jumlahPeserta, $preTest, $postTest, $peningkatanNilai, $kepuasanPeserta, $finalDokumentasi]));

                $existing = EmployeeTraining::where('judul_pelatihan', $judulPelatihan)
                    ->orWhere(function($q) use ($noUndangan) {
                        if ($noUndangan) $q->where('no_undangan', $noUndangan);
                    })->first();

                $payload = [
                    'no_undangan' => $noUndangan,
                    'judul_pelatihan' => $judulPelatihan,
                    'tanggal_pelatihan' => $tanggalPelatihan,
                    'narasumber' => $narasumber,
                    'jumlah_peserta' => $jumlahPeserta,
                    'pre_test' => $preTest,
                    'post_test' => $postTest,
                    'peningkatan_nilai' => $peningkatanNilai,
                    'kepuasan_peserta' => $kepuasanPeserta,
                    'dokumentasi' => $finalDokumentasi,
                    'hasil_evaluasi' => $hasilEvaluasi,
                    'keterangan' => $keterangan,
                    'ceklis_diseminasi' => true,
                    'progress' => 'Selesai Diseminasi',
                    'raw_hash' => $rawHash,
                    'synced_at' => $syncedAt,
                ];

                if ($existing) {
                    $existing->update($payload);
                    $updatedCount++;
                } else {
                    EmployeeTraining::create($payload);
                    $createdCount++;
                }

                $processedCount++;
            }

            // Delete old data not present in this sync run so ONLY active sheet gid=940931713 data remains
            $deletedCount = EmployeeTraining::where('synced_at', '<', $syncedAt)->orWhereNull('synced_at')->delete();

            return response()->json([
                'message' => "Sinkronisasi berhasil! {$processedCount} data Diseminasi diproses ({$createdCount} baru, {$updatedCount} diperbarui, {$deletedCount} data lama dibersihkan).",
                'processed' => $processedCount,
                'created' => $createdCount,
                'updated' => $updatedCount,
                'deleted' => $deletedCount,
                'synced_at' => $syncedAt->toISOString(),
            ]);

        } catch (\Exception $e) {
            Log::error('Google Sheet Sync Error: ' . $e->getMessage());
            return response()->json(['message' => 'Terjadi kesalahan saat sinkronisasi: ' . $e->getMessage()], 500);
        }
    }
}
