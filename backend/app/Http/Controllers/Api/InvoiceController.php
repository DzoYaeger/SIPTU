<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceTax;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Barryvdh\DomPDF\Facade\Pdf;

class InvoiceController extends Controller
{
    /**
     * Helper function untuk mengubah angka ke kalimat terbilang rupiah yang rapi & presisi.
     */
    public static function terbilang($nilai)
    {
        $nilai = abs((float)$nilai);
        if ($nilai == 0) {
            return "Nol Rupiah";
        }

        $text = self::penyebut($nilai);
        $result = trim(preg_replace('/\s+/', ' ', str_replace(['Rupiah', 'rupiah'], '', $text)));
        return $result ? ucwords(strtolower($result)) . " Rupiah" : "Nol Rupiah";
    }

    private static function penyebut($nilai)
    {
        $nilai = abs((float)$nilai);
        $huruf = array("", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas");
        $temp = "";

        if ($nilai < 12) {
            $temp = " " . $huruf[(int)$nilai];
        } else if ($nilai < 20) {
            $temp = self::penyebut($nilai - 10) . " Belas";
        } else if ($nilai < 100) {
            $temp = self::penyebut(intval($nilai / 10)) . " Puluh" . self::penyebut($nilai % 10);
        } else if ($nilai < 200) {
            $temp = " Seratus" . self::penyebut($nilai - 100);
        } else if ($nilai < 1000) {
            $temp = self::penyebut(intval($nilai / 100)) . " Ratus" . self::penyebut($nilai % 100);
        } else if ($nilai < 2000) {
            $temp = " Seribu" . self::penyebut($nilai - 1000);
        } else if ($nilai < 1000000) {
            $temp = self::penyebut(intval($nilai / 1000)) . " Ribu" . self::penyebut($nilai % 1000);
        } else if ($nilai < 1000000000) {
            $temp = self::penyebut(intval($nilai / 1000000)) . " Juta" . self::penyebut($nilai % 1000000);
        } else if ($nilai < 1000000000000) {
            $temp = self::penyebut(intval($nilai / 1000000000)) . " Milyar" . self::penyebut(fmod($nilai, 1000000000));
        } else if ($nilai < 1000000000000000) {
            $temp = self::penyebut(intval($nilai / 1000000000000)) . " Triliun" . self::penyebut(fmod($nilai, 1000000000000));
        }
        return $temp;
    }

    /**
     * Endpoint AI Terbilang Generator (Opsional menggunakan Gemini AI)
     */
    public function aiTerbilang(Request $request)
    {
        $nilai = (float)$request->input('nilai', 0);
        $terbilangStandard = self::terbilang($nilai);

        try {
            $gemini = app(\App\Services\GeminiService::class);
            $prompt = "Ubah nominal uang Rp " . number_format($nilai, 0, ',', '.') . " menjadi kalimat terbilang Bahasa Indonesia resmi untuk invoice/kwitansi. Hanya berikan kalimat terbilangnya saja (tanpa tanda kutip, diakhiri kata Rupiah, huruf kapital di awal setiap kata, contoh: Empat Ratus Ribu Rupiah).";
            
            $aiReply = $gemini->chatAssistant($prompt, []);
            if ($aiReply && strlen(trim($aiReply)) > 3 && strlen(trim($aiReply)) < 150) {
                $terbilangResult = ucwords(strtolower(trim(str_replace(['"', "'"], '', $aiReply))));
                return response()->json([
                    'status' => 'success',
                    'terbilang' => $terbilangResult,
                    'source' => 'ai'
                ]);
            }
        } catch (\Exception $e) {
            // Fallback to standard
        }

        return response()->json([
            'status' => 'success',
            'terbilang' => $terbilangStandard,
            'source' => 'standard'
        ]);
    }

    /**
     * List all Invoices
     */
    public function index(Request $request)
    {
        $query = Invoice::with(['taxes', 'creator', 'approver']);

        // Filter for non-admin/non-validator users: only show invoices created by the logged-in user
        $user = $request->user();
        if ($user) {
            $headerRole = strtolower($request->header('X-Current-Role') ?? '');
            $inputRole = strtolower($request->input('current_role') ?? '');
            $baseRole = strtolower($user->base_role ?? 'operator');
            $currentRole = strtolower($user->current_role ?? $baseRole);

            $isPowerUser = in_array($baseRole, ['admin', 'validator']) ||
                           in_array($currentRole, ['admin', 'validator']) ||
                           in_array($headerRole, ['admin', 'validator']) ||
                           in_array($inputRole, ['admin', 'validator']);

            if (!$isPowerUser) {
                $query->where('created_by', $user->id);
            }
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('ticket_no', 'like', "%$s%")
                  ->orWhere('invoice_no', 'like', "%$s%")
                  ->orWhere('mak', 'like', "%$s%")
                  ->orWhere('deskripsi', 'like', "%$s%")
                  ->orWhere('penerima_name', 'like', "%$s%")
                  ->orWhereHas('creator', fn($cq) => $cq->where('name', 'like', "%$s%"));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('tahun_anggaran')) {
            $query->where('tahun_anggaran', $request->tahun_anggaran);
        }

        $invoices = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => $invoices,
        ]);
    }

    /**
     * Create a new Invoice with multi-tax items
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'tahun_anggaran' => 'nullable|integer',
            'invoice_no' => 'nullable|string',
            'mak' => 'nullable|string',
            'deskripsi' => 'required|string',
            'nilai_kotor' => 'required|numeric|min:0',
            'taxes' => 'nullable|array',
            'taxes.*.jenis_pajak' => 'required|string',
            'taxes.*.nilai_pajak' => 'required|numeric|min:0',
            'ppk_name' => 'nullable|string',
            'ppk_nip' => 'nullable|string',
            'bendahara_name' => 'nullable|string',
            'bendahara_nip' => 'nullable|string',
            'penerima_name' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $nilaiKotor = (float)$request->nilai_kotor;
            $taxesData = $request->input('taxes', []);

            $totalPajak = 0;
            foreach ($taxesData as $tax) {
                $totalPajak += (float)($tax['nilai_pajak'] ?? 0);
            }

            $nilaiBersih = max(0, $nilaiKotor - $totalPajak);
            $terbilangBersih = self::terbilang($nilaiBersih);

            // Generate Ticket No
            $ticketNo = 'INV-' . date('Ymd') . '-' . str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);

            // Fetch default Pejabat Perbendaharaan if not provided
            $pejabat = \App\Models\PejabatPerbendaharaan::with(['bendahara', 'ppk'])->first();
            $ppkName = $request->ppk_name ?: ($pejabat?->ppk?->name ?? 'DODDY PRAYUDI, A.Md');
            $ppkNip = $request->ppk_nip ?: ($pejabat?->ppk?->nip ?? '-');
            $bendaharaName = $request->bendahara_name ?: ($pejabat?->bendahara?->name ?? 'NUR INDAH, S.Sos');
            $bendaharaNip = $request->bendahara_nip ?: ($pejabat?->bendahara?->nip ?? '-');

            $invoice = Invoice::create([
                'ticket_no' => $ticketNo,
                'invoice_no' => $request->invoice_no ?: $ticketNo,
                'tahun_anggaran' => $request->tahun_anggaran ?: date('Y'),
                'mak' => $request->mak,
                'deskripsi' => $request->deskripsi,
                'nilai_kotor' => $nilaiKotor,
                'total_pajak' => $totalPajak,
                'nilai_bersih' => $nilaiBersih,
                'terbilang_bersih' => $terbilangBersih,
                'status' => 'pending',
                'created_by' => $request->user()?->id,
                'ppk_name' => $ppkName,
                'ppk_nip' => $ppkNip,
                'bendahara_name' => $bendaharaName,
                'bendahara_nip' => $bendaharaNip,
                'penerima_name' => $request->penerima_name,
            ]);

            // Save multi-tax items
            foreach ($taxesData as $index => $tax) {
                InvoiceTax::create([
                    'invoice_id' => $invoice->id,
                    'jenis_pajak' => $tax['jenis_pajak'],
                    'tax_type' => $tax['tax_type'] ?? 'fixed',
                    'tax_rate' => $tax['tax_rate'] ?? 0,
                    'nilai_pajak' => (float)$tax['nilai_pajak'],
                    'sort_order' => $index + 1,
                ]);
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Invoice berhasil dibuat',
                'data' => $invoice->load('taxes'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal membuat invoice: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Show single Invoice
     */
    public function show($id)
    {
        $invoice = Invoice::with(['taxes', 'creator', 'approver'])->find($id);

        if (!$invoice) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invoice tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $invoice,
        ]);
    }

    /**
     * Update Invoice
     */
    public function update(Request $request, $id)
    {
        $invoice = Invoice::find($id);

        if (!$invoice) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invoice tidak ditemukan',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'tahun_anggaran' => 'nullable|integer',
            'invoice_no' => 'nullable|string',
            'mak' => 'nullable|string',
            'deskripsi' => 'required|string',
            'nilai_kotor' => 'required|numeric|min:0',
            'taxes' => 'nullable|array',
            'taxes.*.jenis_pajak' => 'required|string',
            'taxes.*.nilai_pajak' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $nilaiKotor = (float)$request->nilai_kotor;
            $taxesData = $request->input('taxes', []);

            $totalPajak = 0;
            foreach ($taxesData as $tax) {
                $totalPajak += (float)($tax['nilai_pajak'] ?? 0);
            }

            $nilaiBersih = max(0, $nilaiKotor - $totalPajak);
            $terbilangBersih = self::terbilang($nilaiBersih);

            $invoice->update([
                'tahun_anggaran' => $request->tahun_anggaran ?: $invoice->tahun_anggaran,
                'invoice_no' => $request->invoice_no ?: $invoice->invoice_no,
                'mak' => $request->mak,
                'deskripsi' => $request->deskripsi,
                'nilai_kotor' => $nilaiKotor,
                'total_pajak' => $totalPajak,
                'nilai_bersih' => $nilaiBersih,
                'terbilang_bersih' => $terbilangBersih,
                'ppk_name' => $request->ppk_name,
                'ppk_nip' => $request->ppk_nip,
                'bendahara_name' => $request->bendahara_name,
                'bendahara_nip' => $request->bendahara_nip,
                'penerima_name' => $request->penerima_name,
            ]);

            // Replace taxes
            InvoiceTax::where('invoice_id', $invoice->id)->delete();

            foreach ($taxesData as $index => $tax) {
                InvoiceTax::create([
                    'invoice_id' => $invoice->id,
                    'jenis_pajak' => $tax['jenis_pajak'],
                    'tax_type' => $tax['tax_type'] ?? 'fixed',
                    'tax_rate' => $tax['tax_rate'] ?? 0,
                    'nilai_pajak' => (float)$tax['nilai_pajak'],
                    'sort_order' => $index + 1,
                ]);
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Invoice berhasil diperbarui',
                'data' => $invoice->load('taxes'),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memperbarui invoice: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete Invoice
     */
    public function destroy($id)
    {
        $invoice = Invoice::find($id);

        if (!$invoice) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invoice tidak ditemukan',
            ], 404);
        }

        $invoice->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Invoice berhasil dihapus',
        ]);
    }

    /**
     * Approve Invoice
     */
    public function approve(Request $request, $id)
    {
        $invoice = Invoice::find($id);

        if (!$invoice) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invoice tidak ditemukan',
            ], 404);
        }

        $invoice->update([
            'status' => 'approved',
            'approved_by' => $request->user()?->id,
            'approved_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Invoice berhasil disetujui',
            'data' => $invoice,
        ]);
    }

    /**
     * Export Invoice PDF in F4 Paper Size (Folio - 215.9mm x 330mm)
     */
    public function exportPdf($id)
    {
        $invoice = Invoice::with(['taxes', 'creator', 'approver'])->find($id);

        if (!$invoice) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invoice tidak ditemukan',
            ], 404);
        }

        // F4 Paper dimensions in Points: 8.5 in x 13 in = 612 pt x 936 pt
        $pejabat = \App\Models\PejabatPerbendaharaan::with(['bendahara', 'ppk'])->first();
        if (empty($invoice->ppk_name) && $pejabat?->ppk) {
            $invoice->ppk_name = $pejabat->ppk->name;
            $invoice->ppk_nip = $pejabat->ppk->nip;
        }
        if (empty($invoice->bendahara_name) && $pejabat?->bendahara) {
            $invoice->bendahara_name = $pejabat->bendahara->name;
            $invoice->bendahara_nip = $pejabat->bendahara->nip;
        }
        // Always ensure clean terbilang calculation dynamically
        $invoice->terbilang_bersih = self::terbilang($invoice->nilai_bersih);

        // F4 Paper dimensions in Points: 8.5 in x 13 in = 612 pt x 936 pt
        $pdf = Pdf::loadView('pdf.invoice_report', [
            'invoice' => $invoice,
        ])->setPaper([0, 0, 612, 936]);

        $fileName = 'BUKTI_PEMBELIAN_' . str_replace('/', '_', $invoice->invoice_no) . '.pdf';

        return $pdf->stream($fileName);
    }
}
