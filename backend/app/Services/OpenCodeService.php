<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Budget;
use App\Models\Employee;

class OpenCodeService
{
    protected string $apiKey;
    protected string $baseUrl;
    protected string $model;

    public function __construct()
    {
        $this->apiKey = config('services.opencode.api_key', env('OPENCODE_API_KEY', ''));
        $this->baseUrl = rtrim(config('services.opencode.base_url', env('OPENCODE_BASE_URL', 'https://api.opencode.ai/v1')), '/');
        $this->model = config('services.opencode.model', env('OPENCODE_MODEL', 'deepseek/deepseek-chat:free'));
    }

    /**
     * Chat assistant using OpenCode / OpenAI-compatible endpoint.
     */
    public function chatAssistant(string $message, array $context = [], array $history = []): string
    {
        if (empty($this->apiKey)) {
            Log::error('OpenCode API Key is missing in .env');
            return "Maaf, konfigurasi API Key OpenCode belum tersedia di server. Silakan hubungi admin.";
        }

        try {
            $systemPrompt = "Anda adalah SIPTU Concierge, asisten digital cerdas dan resmi dari Sistem Informasi Pengelolaan Tata Usaha (SIPTU ULTRA) Balai Besar POM di Palopo.\n"
                . "IDENTITAS UTAMA: Anda adalah 'SIPTU Concierge'. JANGAN PERNAH menyebutkan bahwa Anda adalah model dari Google, OpenAI, DeepSeek, atau entitas luar lainnya.\n\n"
                . "KAPABILITAS & TUGAS OPERASIONAL:\n"
                . "1. Memberikan informasi dan panduan operasional layanan SIPTU (BMN, Arsip, Surat Tugas, Rispeg/Izin Keluar, IT Helpdesk, SIMKEU, dan MCU).\n"
                . "2. Pengecekan realisasi anggaran, sisa pagu, dan penyerapan Kode Akun secara real-time melalui fungsi `cek_realisasi_anggaran`.\n"
                . "3. Pencarian data rekan pegawai atau NIP melalui fungsi `cari_data_pegawai`.\n"
                . "4. Pembuatan draf/pencatatan izin keluar, tiket helpdesk, dan peminjaman BMN.\n\n"
                . "ATURAN KOMUNIKASI:\n"
                . "- Gunakan Bahasa Indonesia yang sopan, formal, ramah, dan solutif.\n"
                . "- Jika pengguna menanyakan data sistem (anggaran, pegawai), LANGSUNG panggil tool yang relevan tanpa menunggu konfirmasi tambahan.\n"
                . "- Pertahankan alur percakapan yang kontekstual dan ringkas.";

            $messages = [
                [
                    'role' => 'system',
                    'content' => $systemPrompt,
                ]
            ];

            // Append context if available
            if (!empty($context)) {
                $messages[] = [
                    'role' => 'system',
                    'content' => "Konteks data pengguna saat ini:\n" . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
                ];
            }

            // Append history turns (user / assistant)
            if (!empty($history) && is_array($history)) {
                foreach ($history as $turn) {
                    $role = ($turn['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
                    $text = $turn['content'] ?? '';
                    if (empty(trim($text))) continue;

                    $messages[] = [
                        'role' => $role,
                        'content' => $text,
                    ];
                }
            }

            // Append current user message
            $messages[] = [
                'role' => 'user',
                'content' => $message,
            ];

            $tools = $this->getTools();
            $url = "{$this->baseUrl}/chat/completions";

            $payload = [
                'model' => $this->model,
                'messages' => $messages,
                'temperature' => 0.6,
                'max_tokens' => 2000,
            ];

            if (!empty($tools)) {
                $payload['tools'] = $tools;
                $payload['tool_choice'] = 'auto';
            }

            $response = Http::timeout(60)
                ->withHeaders([
                    'Authorization' => "Bearer {$this->apiKey}",
                    'Content-Type' => 'application/json',
                    'HTTP-Referer' => config('app.url', 'https://siptu.bpompalopo.com'),
                    'X-Title' => 'SIPTU ULTRA Concierge',
                ])
                ->post($url, $payload);

            if (!$response->successful()) {
                $errorBody = $response->json();
                $errorMsg = $errorBody['error']['message'] ?? ('HTTP ' . $response->status() . ' ' . $response->body());
                Log::error('OpenCode API Error', [
                    'status' => $response->status(),
                    'body' => $errorBody,
                    'model' => $this->model,
                ]);
                return "Maaf, terjadi kendala saat menghubungi asisten AI SIPTU. (Error: " . $errorMsg . ")";
            }

            $result = $response->json();
            $choice = $result['choices'][0] ?? null;
            if (!$choice) {
                return "Maaf, tidak ada respon dari server asisten AI.";
            }

            $responseMessage = $choice['message'] ?? [];

            // Check if model requested tool calls
            $toolCalls = $responseMessage['tool_calls'] ?? [];
            $maxIterations = 5;
            $iteration = 0;

            while (!empty($toolCalls) && $iteration < $maxIterations) {
                $iteration++;
                $messages[] = $responseMessage; // Append assistant tool_calls turn

                foreach ($toolCalls as $toolCall) {
                    $toolCallId = $toolCall['id'] ?? ('call_' . uniqid());
                    $functionName = $toolCall['function']['name'] ?? '';
                    $rawArgs = $toolCall['function']['arguments'] ?? '{}';
                    $args = is_array($rawArgs) ? $rawArgs : (json_decode($rawArgs, true) ?: []);

                    Log::info("OpenCode Tool Call: $functionName", ['args' => $args]);
                    $functionResult = $this->executeLocalFunction($functionName, $args);

                    $messages[] = [
                        'role' => 'tool',
                        'tool_call_id' => $toolCallId,
                        'name' => $functionName,
                        'content' => is_string($functionResult) ? $functionResult : json_encode($functionResult, JSON_UNESCAPED_UNICODE),
                    ];
                }

                // Follow-up request with tool results
                $payload['messages'] = $messages;
                $followUpResponse = Http::timeout(60)
                    ->withHeaders([
                        'Authorization' => "Bearer {$this->apiKey}",
                        'Content-Type' => 'application/json',
                        'HTTP-Referer' => config('app.url', 'https://siptu.bpompalopo.com'),
                        'X-Title' => 'SIPTU ULTRA Concierge',
                    ])
                    ->post($url, $payload);

                if (!$followUpResponse->successful()) {
                    Log::error('OpenCode Tool Follow-up Error', ['body' => $followUpResponse->json()]);
                    break;
                }

                $followUpResult = $followUpResponse->json();
                $choice = $followUpResult['choices'][0] ?? null;
                if (!$choice) break;

                $responseMessage = $choice['message'] ?? [];
                $toolCalls = $responseMessage['tool_calls'] ?? [];
            }

            $finalContent = $responseMessage['content'] ?? '';
            return trim($finalContent) ?: "Halo! Ada yang bisa SIPTU Concierge bantu terkait operasional hari ini?";

        } catch (\Exception $e) {
            Log::error('OpenCode Chat Error: ' . $e->getMessage());
            return "Terjadi kesalahan pada sistem asisten AI SIPTU: " . $e->getMessage();
        }
    }

    /**
     * Define OpenAI-compatible Tools
     */
    protected function getTools(): array
    {
        return [
            [
                'type' => 'function',
                'function' => [
                    'name' => 'cari_data_pegawai',
                    'description' => 'Mencari data kepegawaian (nama, NIP, jabatan, area fungsi) berdasarkan nama atau NIP.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'nama_pegawai' => [
                                'type' => 'string',
                                'description' => 'Nama lengkap atau potongan nama atau NIP pegawai yang dicari.'
                            ]
                        ],
                        'required' => ['nama_pegawai']
                    ]
                ]
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'cek_realisasi_anggaran',
                    'description' => 'Mengecek data realisasi anggaran per bulan, per Kode Akun, sisa pagu, dan persentase penyerapan anggaran secara akurat.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'tahun' => [
                                'type' => 'integer',
                                'description' => 'Tahun anggaran (contoh: 2025, 2026). Default tahun berjalan.'
                            ],
                            'bulan' => [
                                'type' => 'integer',
                                'description' => 'Angka bulan 1-12 (1=Januari, 8=Agustus). Kosongkan untuk rekap total satu tahun.'
                            ],
                            'mak' => [
                                'type' => 'string',
                                'description' => 'Kode Akun spesifik jika dicari (contoh: 524111, 521211).'
                            ]
                        ]
                    ]
                ]
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'ajukan_peminjaman_bmn',
                    'description' => 'Membuat pengajuan peminjaman aset kantor (BMN).',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'nip' => ['type' => 'string'],
                            'password' => ['type' => 'string', 'description' => 'Password SIPTU user untuk TTE.'],
                            'loan_date' => ['type' => 'string', 'description' => 'YYYY-MM-DD'],
                            'return_date' => ['type' => 'string', 'description' => 'YYYY-MM-DD'],
                            'assets' => [
                                'type' => 'array',
                                'items' => [
                                    'type' => 'object',
                                    'properties' => [
                                        'asset_id' => ['type' => 'integer'],
                                        'nama_barang' => ['type' => 'string']
                                    ]
                                ]
                            ],
                            'location' => ['type' => 'string'],
                            'notes' => ['type' => 'string']
                        ],
                        'required' => ['nip', 'password', 'loan_date', 'return_date', 'assets']
                    ]
                ]
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'ajukan_surat_tugas',
                    'description' => 'Membuat draf pengajuan surat tugas baru.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'employee_ids' => ['type' => 'array', 'items' => ['type' => 'integer']],
                            'ketua_tim_id' => ['type' => 'integer'],
                            'tanggal_mulai' => ['type' => 'string', 'description' => 'YYYY-MM-DD'],
                            'tanggal_selesai' => ['type' => 'string', 'description' => 'YYYY-MM-DD'],
                            'mak' => ['type' => 'string'],
                            'lokasi_tugas' => ['type' => 'string'],
                            'deskripsi_tugas' => ['type' => 'string'],
                            'password' => ['type' => 'string', 'description' => 'Password SIPTU Katim untuk TTE.']
                        ],
                        'required' => ['employee_ids', 'ketua_tim_id', 'tanggal_mulai', 'tanggal_selesai']
                    ]
                ]
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'ajukan_izin_keluar',
                    'description' => 'Mencatat izin keluar kantor.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'nip' => ['type' => 'string'],
                            'permit_type' => ['type' => 'string', 'enum' => ['Pribadi', 'Kantor']],
                            'reason' => ['type' => 'string']
                        ],
                        'required' => ['nip', 'permit_type']
                    ]
                ]
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'ajukan_it_helpdesk',
                    'description' => 'Melaporkan kendala IT (hardware, software, network, dll).',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'report_type' => ['type' => 'string', 'enum' => ['hardware', 'software', 'network', 'other']],
                            'problem_details' => ['type' => 'string'],
                            'password' => ['type' => 'string', 'description' => 'Password SIPTU untuk TTE.']
                        ],
                        'required' => ['report_type', 'problem_details']
                    ]
                ]
            ]
        ];
    }

    /**
     * Dispatcher to execute local database & business functions.
     */
    protected function executeLocalFunction(string $name, array $args)
    {
        switch ($name) {
            case 'cari_data_pegawai':
                return $this->handleCariDataPegawai($args['nama_pegawai'] ?? '');
            case 'cek_realisasi_anggaran':
                return $this->handleCekRealisasiAnggaran($args);
            case 'ajukan_peminjaman_bmn':
                return $this->handleSubmitBmnLoan($args);
            case 'ajukan_surat_tugas':
                return $this->handleSubmitSuratTugas($args);
            case 'ajukan_izin_keluar':
                return $this->handleSubmitExitPermit($args);
            case 'ajukan_it_helpdesk':
                return $this->handleSubmitItHelpdesk($args);
            default:
                return ['error' => "Fungsi {$name} tidak ditemukan."];
        }
    }

    protected function handleCariDataPegawai(string $nama)
    {
        $pegawai = Employee::where('name', 'like', "%$nama%")
            ->orWhere('nip', 'like', "%$nama%")
            ->get(['id', 'nip', 'name', 'function_area', 'position'])
            ->take(5);

        return $pegawai->isEmpty() ? ['message' => 'Data pegawai tidak ditemukan.'] : $pegawai->toArray();
    }

    protected function handleCekRealisasiAnggaran(array $args)
    {
        $tahun = !empty($args['tahun']) ? (int)$args['tahun'] : (int)date('Y');
        $bulan = !empty($args['bulan']) ? (int)$args['bulan'] : null;
        $mak = !empty($args['mak']) ? trim($args['mak']) : null;

        $budgetsQuery = Budget::query();
        if ($mak) {
            $budgetsQuery->where('mak', 'like', "%{$mak}%");
        }
        $budgets = $budgetsQuery->get();

        if ($budgets->isEmpty()) {
            return [
                'status' => 'not_found',
                'message' => 'Data anggaran untuk Kode Akun ' . ($mak ?? 'tersebut') . ' tidak ditemukan.'
            ];
        }

        // Invoices
        $invQuery = DB::table('invoices')
            ->select('mak', DB::raw('SUM(nilai_bersih) as total_realisasi'))
            ->whereNotNull('mak')
            ->whereIn('status', ['approved', 'paid', 'Selesai', 'Disetujui', 'final', 'completed']);

        if ($tahun) {
            $invQuery->whereYear('created_at', $tahun);
        }
        if ($bulan) {
            $invQuery->whereMonth('created_at', $bulan);
        }
        $realisasiInvoices = $invQuery->groupBy('mak')->pluck('total_realisasi', 'mak');

        // Perjadin (Surat Tugas / LPJ)
        $stQuery = DB::table('lpj_items')
            ->join('lpj_headers', 'lpj_items.lpj_header_id', '=', 'lpj_headers.id')
            ->join('surat_tugas', 'lpj_headers.surat_tugas_id', '=', 'surat_tugas.id')
            ->select('surat_tugas.mak', DB::raw('SUM(
                COALESCE(uang_harian,0) + COALESCE(uang_penginapan,0) + COALESCE(uang_transport_taxi,0) + 
                COALESCE(uang_transport_bus,0) + COALESCE(uang_transport_bbm,0) + COALESCE(uang_transport_sewa_mobil,0) + 
                COALESCE(uang_transport_pesawat,0) + COALESCE(uang_fullboard,0) + COALESCE(uang_harian_fullboard,0) + 
                COALESCE(uang_transport_lokal,0) + COALESCE(uang_transport_umum,0)
            ) as total_realisasi'))
            ->whereNotNull('surat_tugas.mak');

        if ($tahun) {
            $stQuery->whereYear('lpj_headers.created_at', $tahun);
        }
        if ($bulan) {
            $stQuery->whereMonth('lpj_headers.created_at', $bulan);
        }
        $realisasiPerjadin = $stQuery->groupBy('surat_tugas.mak')->pluck('total_realisasi', 'surat_tugas.mak');

        $namaBulan = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];

        $periodeText = $bulan && isset($namaBulan[$bulan])
            ? "Bulan {$namaBulan[$bulan]} {$tahun}"
            : "Tahun {$tahun}";

        $resultList = [];
        $totalPaguAll = 0;
        $totalRealisasiAll = 0;

        foreach ($budgets as $b) {
            $pagu = (float) $b->anggaran;
            $inv = (float) ($realisasiInvoices->get($b->mak) ?? 0);
            $st = (float) ($realisasiPerjadin->get($b->mak) ?? 0);
            $totalRealisasi = $inv + $st;
            $sisa = $pagu - $totalRealisasi;
            $persen = $pagu > 0 ? round(($totalRealisasi / $pagu) * 100, 2) : 0;

            $totalPaguAll += $pagu;
            $totalRealisasiAll += $totalRealisasi;

            $resultList[] = [
                'mak' => $b->mak,
                'deskripsi' => $b->deskripsi ?? 'Tanpa deskripsi',
                'pagu' => "Rp " . number_format($pagu, 0, ',', '.'),
                'realisasi_pembelian' => "Rp " . number_format($inv, 0, ',', '.'),
                'realisasi_perjadin' => "Rp " . number_format($st, 0, ',', '.'),
                'total_realisasi' => "Rp " . number_format($totalRealisasi, 0, ',', '.'),
                'sisa_anggaran' => "Rp " . number_format($sisa, 0, ',', '.'),
                'persentase_realisasi' => $persen . "%"
            ];
        }

        $totalSisaAll = $totalPaguAll - $totalRealisasiAll;
        $totalPersenAll = $totalPaguAll > 0 ? round(($totalRealisasiAll / $totalPaguAll) * 100, 2) : 0;

        return [
            'periode' => $periodeText,
            'ringkasan_total' => [
                'total_pagu' => "Rp " . number_format($totalPaguAll, 0, ',', '.'),
                'total_realisasi' => "Rp " . number_format($totalRealisasiAll, 0, ',', '.'),
                'total_sisa_anggaran' => "Rp " . number_format($totalSisaAll, 0, ',', '.'),
                'persentase_realisasi' => $totalPersenAll . "%"
            ],
            'detail_per_mak' => $resultList
        ];
    }

    protected function handleSubmitBmnLoan(array $args)
    {
        $request = new \Illuminate\Http\Request($args);
        $controller = new \App\Http\Controllers\Api\BmnLoanController();
        $response = $controller->storePublic($request);
        return $response->getData();
    }

    protected function handleSubmitSuratTugas(array $args)
    {
        $request = new \Illuminate\Http\Request($args);
        $controller = new \App\Http\Controllers\Api\SuratTugasController();
        $response = $controller->storePublic($request, app(\App\Services\FonnteService::class));
        return $response->getData();
    }

    protected function handleSubmitExitPermit(array $args)
    {
        $args['latitude'] = -2.986295;
        $args['longitude'] = 120.183702;

        $request = new \Illuminate\Http\Request($args);
        $controller = new \App\Http\Controllers\Api\ExitPermitController();
        $response = $controller->publicRecordExitByNip($request);
        return $response->getData();
    }

    protected function handleSubmitItHelpdesk(array $args)
    {
        $user = Auth::user();
        if (!$user) return ['error' => 'User harus login untuk melapor IT Helpdesk.'];

        $args['employee_nip'] = $user->nip;
        $args['employee_name'] = $user->name;

        $request = new \Illuminate\Http\Request($args);
        $controller = new \App\Http\Controllers\Api\ItHelpdeskTicketController();
        $response = $controller->store($request, app(\App\Services\FonnteService::class));
        return $response->getData();
    }
}
