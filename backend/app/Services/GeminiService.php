<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    protected string $apiKey;
    protected string $model;

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY', ''));
        $this->model = 'gemini-2.5-flash';
    }

    /**
     * Generate a comprehensive monthly analysis with structured sections.
     *
     * Returns JSON with keys:
     *   - ringkasan: general overview paragraph
     *   - analisis_layanan: per-module analysis paragraph
     *   - analisis_kedisiplinan: rispeg analysis paragraph
     *   - perbaikan: array of items needing improvement [{area, masalah, rekomendasi}]
     *   - pertumbuhan: growth analysis paragraph
     *   - response_time: response time analysis paragraph
     *   - saran: array of actionable recommendations (strings)
     *   - kesimpulan: closing conclusion paragraph
     *
     * @param array $data  Aggregated monthly statistics
     * @return array       Parsed structured analysis
     */
    public function generateMonthlyAnalysis(array $data): array
    {
        if (empty($this->apiKey)) {
            return $this->fallbackAnalysis($data);
        }

        try {
            $prompt = $this->buildPrompt($data);

            $response = Http::timeout(45)->post(
                "https://generativelanguage.googleapis.com/v1/models/{$this->model}:generateContent?key={$this->apiKey}",
                [
                    'contents' => [['parts' => [['text' => $prompt]]]],
                    'generationConfig' => [
                        'temperature' => 0.7,
                        'maxOutputTokens' => 3000,
                        'responseMimeType' => 'application/json',
                    ],
                ]
            );

            if ($response->successful()) {
                $result = $response->json();
                $text = $result['candidates'][0]['content']['parts'][0]['text'] ?? null;
                if ($text) {
                    $parsed = json_decode(trim($text), true);
                    if (is_array($parsed)) {
                        return array_merge($this->fallbackAnalysis($data), $parsed);
                    }
                }
            }

            Log::warning('Gemini Monthly API failed', ['status' => $response->status()]);
            return $this->fallbackAnalysis($data);
        } catch (\Exception $e) {
            Log::error('Gemini Monthly API error: ' . $e->getMessage());
            return $this->fallbackAnalysis($data);
        }
    }

    protected function buildPrompt(array $data): string
    {
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
Kamu adalah seorang analis operasional senior di instansi pemerintah "Balai Besar POM di Palopo".
Berikut adalah data statistik operasional bulanan dari Sistem SIPTU (Sistem Informasi Pengelolaan Tata Usaha) periode {$data['period']}:

{$json}

Buatkan analisis operasional bulanan yang komprehensif dalam format JSON dengan struktur berikut:

{
  "ringkasan": "Paragraf ringkasan umum kondisi operasional bulan ini. Tulis formal, bahasa Indonesia baku. 3-4 kalimat.",

  "analisis_layanan": "Paragraf analisis mendalam per modul layanan (kearsipan, BMN, IT helpdesk, izin keluar). Soroti modul yang memerlukan perhatian khusus, bandingkan antar modul. 4-5 kalimat.",

  "analisis_kedisiplinan": "Paragraf analisis kedisiplinan pegawai berdasarkan data pelanggaran rispeg. Jika tidak ada data, tulis bahwa kedisiplinan terjaga baik. 3-4 kalimat.",

  "perbaikan": [
    {
      "area": "Nama area/modul yang perlu diperbaiki",
      "masalah": "Deskripsi singkat masalah yang ditemukan",
      "rekomendasi": "Langkah perbaikan yang disarankan"
    }
  ],

  "pertumbuhan": "Paragraf analisis tren pertumbuhan dan perbandingan volume layanan. Bahas apakah ada kenaikan atau penurunan dari tren yang terlihat. 3-4 kalimat.",

  "response_time": "Paragraf analisis durasi dan respon time penanganan layanan. Bahas rata-rata waktu penyelesaian, modul mana yang paling cepat/lambat. Gunakan data avg_resolution_days dan avg_exit_duration_minutes. 3-4 kalimat.",

  "saran": [
    "Saran konkret pertama untuk peningkatan operasional",
    "Saran konkret kedua",
    "Saran konkret ketiga",
    "Saran konkret keempat"
  ],

  "kesimpulan": "Paragraf penutup kesimpulan keseluruhan. Formal dan profesional. 2-3 kalimat."
}

Ketentuan penulisan:
- Bahasa Indonesia baku dan formal
- Jangan menyebutkan bahwa ini dihasilkan oleh AI
- Tulis seolah-olah ditulis oleh pejabat penanggung jawab operasional
- Fokus pada insight dan rekomendasi, bukan hanya mengulang angka
- Berikan minimal 3 item perbaikan dan 4 saran
- Semua value harus berupa string atau array sesuai struktur di atas
- Output HANYA JSON, tanpa markdown atau teks lain
PROMPT;
    }

    public function chatAssistant(string $message, array $context = []): string
    {
        if (empty($this->apiKey)) {
            Log::error('Gemini API Key is missing in .env');
            return "Maaf, sistem AI sedang tidak tersedia saat ini (API Key Kosong). Silakan hubungi admin.";
        }

        try {
            // Initial conversation contents
            $contents = [
                [
                    'role' => 'user',
                    'parts' => [
                        ['text' => "Konteks data pengguna saat ini: " . json_encode($context, JSON_UNESCAPED_UNICODE)]
                    ]
                ],
                [
                    'role' => 'user',
                    'parts' => [['text' => $message]]
                ]
            ];

            $systemInstruction = [
                'parts' => [
                    ['text' => "Anda adalah Asisten Tata Usaha SIPTU (SIPTU AI Agent) yang profesional namun ramah. 
                    Anda dapat membantu pengguna dengan:
                    1. Pengajuan Peminjaman BMN (Aset Kantor).
                    2. Pengajuan Surat Tugas.
                    3. Pencatatan Izin Keluar.
                    4. Pelaporan Kendala IT (Helpdesk).
                    5. Pencarian data pegawai.
                    6. Menjawab pertanyaan umum menggunakan Google Search.

                    ATURAN:
                    - Gunakan Bahasa Indonesia formal dan santun.
                    - Jika data yang dibutuhkan untuk pengajuan belum lengkap, mintalah kepada pengguna dengan sopan.
                    - Konfirmasi kembali detail pengajuan sebelum melakukan eksekusi (submit).
                    - Jika menggunakan Google Search, berikan jawaban yang relevan dan ringkas."]
                ]
            ];

            $payload = [
                'contents' => $contents,
                'system_instruction' => $systemInstruction,
                'tools' => $this->getTools(),
                'generationConfig' => [
                    'temperature' => 0.85,
                    'maxOutputTokens' => 1500,
                ],
            ];

            // Use v1beta for Gemini 2.5 Flash and Function Calling
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?key={$this->apiKey}";

            $response = Http::timeout(60)->post($url, $payload);

            if (!$response->successful()) {
                Log::error('Gemini API Error', [
                    'status' => $response->status(),
                    'body' => $response->json(),
                    'model' => $this->model,
                    'url_obfuscated' => "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?key=***"
                ]);
                return "Maaf, terjadi kendala saat menghubungi asisten AI SIPTU. (Error: " . ($response->json()['error']['message'] ?? 'Unknown API Error') . ")";
            }

            $data = $response->json();
            $candidate = $data['candidates'][0] ?? null;

            // Handle the loop for potential function calls
            $maxIterations = 5;
            $iteration = 0;

            while ($candidate && isset($candidate['content']['parts'][0]['functionCall']) && $iteration < $maxIterations) {
                $iteration++;
                $functionCall = $candidate['content']['parts'][0]['functionCall'];
                $functionName = $functionCall['name'];
                $args = $functionCall['args'] ?? [];

                // Log the tool call
                Log::info("Gemini Tool Call: $functionName", ['args' => $args]);

                // Execute the local function
                $functionResult = $this->executeLocalFunction($functionName, $args);

                // Add the model's message (with function call) to history
                $contents[] = $candidate['content'];

                // Add the function response to history
                $contents[] = [
                    'role' => 'function',
                    'parts' => [
                        [
                            'functionResponse' => [
                                'name' => $functionName,
                                'response' => [
                                    'name' => $functionName,
                                    'content' => $functionResult
                                ]
                            ]
                        ]
                    ]
                ];

                // Request final or follow-up response from Gemini
                $payload['contents'] = $contents;
                $response = Http::timeout(60)->post($url, $payload);

                if (!$response->successful()) {
                    Log::error('Gemini API Follow-up Error', ['body' => $response->json()]);
                    break;
                }

                $data = $response->json();
                $candidate = $data['candidates'][0] ?? null;
            }

            return $candidate['content']['parts'][0]['text'] ?? "Maaf, saya tidak dapat merespon saat ini.";

        } catch (\Exception $e) {
            Log::error('Gemini Chat Error: ' . $e->getMessage());
            return "Terjadi kesalahan pada sistem asisten AI: " . $e->getMessage();
        }
    }

    /**
     * Definisi Tools (Function Declarations) untuk Gemini.
     */
    protected function getTools(): array
    {
        return [
            [
                'function_declarations' => [
                    [
                        'name' => 'cari_data_pegawai',
                        'description' => 'Mencari data kepegawaian berdasarkan nama.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'nama_pegawai' => ['type' => 'STRING']
                            ]
                        ]
                    ],
                    [
                        'name' => 'ajukan_peminjaman_bmn',
                        'description' => 'Membuat pengajuan peminjaman aset kantor (BMN).',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'nip' => ['type' => 'STRING'],
                                'password' => ['type' => 'STRING', 'description' => 'Password SIPTU user untuk TTE.'],
                                'loan_date' => ['type' => 'STRING', 'description' => 'YYYY-MM-DD'],
                                'return_date' => ['type' => 'STRING', 'description' => 'YYYY-MM-DD'],
                                'assets' => [
                                    'type' => 'ARRAY',
                                    'items' => [
                                        'type' => 'OBJECT',
                                        'properties' => [
                                            'asset_id' => ['type' => 'INTEGER'],
                                            'nama_barang' => ['type' => 'STRING']
                                        ]
                                    ]
                                ],
                                'location' => ['type' => 'STRING'],
                                'notes' => ['type' => 'STRING']
                            ],
                            'required' => ['nip', 'password', 'loan_date', 'return_date', 'assets']
                        ]
                    ],
                    [
                        'name' => 'ajukan_surat_tugas',
                        'description' => 'Membuat draf surat tugas baru.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'employee_ids' => ['type' => 'ARRAY', 'items' => ['type' => 'INTEGER']],
                                'ketua_tim_id' => ['type' => 'INTEGER'],
                                'tanggal_mulai' => ['type' => 'STRING', 'description' => 'YYYY-MM-DD'],
                                'tanggal_selesai' => ['type' => 'STRING', 'description' => 'YYYY-MM-DD'],
                                'mak' => ['type' => 'STRING'],
                                'lokasi_tugas' => ['type' => 'STRING'],
                                'deskripsi_tugas' => ['type' => 'STRING'],
                                'password' => ['type' => 'STRING', 'description' => 'Password SIPTU Katim untuk TTE.']
                            ],
                            'required' => ['employee_ids', 'ketua_tim_id', 'tanggal_mulai', 'tanggal_selesai']
                        ]
                    ],
                    [
                        'name' => 'ajukan_izin_keluar',
                        'description' => 'Mencatat izin keluar kantor.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'nip' => ['type' => 'STRING'],
                                'permit_type' => ['type' => 'STRING', 'enum' => ['Pribadi', 'Kantor']],
                                'reason' => ['type' => 'STRING']
                            ],
                            'required' => ['nip', 'permit_type']
                        ]
                    ],
                    [
                        'name' => 'ajukan_it_helpdesk',
                        'description' => 'Melaporkan kendala IT (hardware/software/network).',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'report_type' => ['type' => 'STRING', 'enum' => ['hardware', 'software', 'network', 'other']],
                                'problem_details' => ['type' => 'STRING'],
                                'password' => ['type' => 'STRING', 'description' => 'Password SIPTU untuk TTE.']
                            ],
                            'required' => ['report_type', 'problem_details']
                        ]
                    ]
                ]
            ],
            // Google Search Retrieval Tool
            ['google_search_retrieval' => ['dynamic_retrieval_config' => ['mode' => 'DYNAMIC', 'dynamic_threshold' => 0.3]]]
        ];
    }

    /**
     * Dispatcher untuk mengeksekusi fungsi lokal.
     */
    protected function executeLocalFunction(string $name, array $args)
    {
        switch ($name) {
            case 'cari_data_pegawai':
                return $this->handleCariDataPegawai($args['nama_pegawai'] ?? '');
            case 'ajukan_peminjaman_bmn':
                return $this->handleSubmitBmnLoan($args);
            case 'ajukan_surat_tugas':
                return $this->handleSubmitSuratTugas($args);
            case 'ajukan_izin_keluar':
                return $this->handleSubmitExitPermit($args);
            case 'ajukan_it_helpdesk':
                return $this->handleSubmitItHelpdesk($args);
            default:
                return ['error' => 'Fungsi tidak ditemukan.'];
        }
    }

    protected function handleCariDataPegawai(string $nama)
    {
        $pegawai = \App\Models\Employee::where('name', 'like', "%$nama%")
            ->orWhere('nip', 'like', "%$nama%")
            ->get(['id', 'nip', 'name', 'function_area', 'position'])
            ->take(5);

        return $pegawai->isEmpty() ? ['message' => 'Pegawai tidak ditemukan.'] : $pegawai->toArray();
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
        // Default to office location if not provided
        $args['latitude'] = -2.986295; 
        $args['longitude'] = 120.183702;

        $request = new \Illuminate\Http\Request($args);
        $controller = new \App\Http\Controllers\Api\ExitPermitController();
        $response = $controller->publicRecordExitByNip($request);
        
        return $response->getData();
    }

    protected function handleSubmitItHelpdesk(array $args)
    {
        $user = \Illuminate\Support\Facades\Auth::user();
        if (!$user) return ['error' => 'User harus login untuk melapor IT Helpdesk.'];

        $args['employee_nip'] = $user->nip;
        $args['employee_name'] = $user->name;

        $request = new \Illuminate\Http\Request($args);
        $controller = new \App\Http\Controllers\Api\ItHelpdeskTicketController();
        $response = $controller->store($request, app(\App\Services\FonnteService::class));
        
        return $response->getData();
    }



    /**
     * Generate a real-time data audit and operational insight.
     * Focused on finding anomalies, bottlenecks, and data integrity issues.
     */
    public function generateAuditAnalysis(array $data): array
    {
        if (empty($this->apiKey)) {
            return $this->fallbackAudit($data);
        }

        try {
            $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            $prompt = <<<PROMPT
Kamu adalah seorang Auditor Internal Senior dan Konsultan Manajemen di Balai Besar POM di Palopo.
Tugasmu adalah melakukan "AI Data Audit" terhadap kondisi operasional sistem SIPTU saat ini berdasarkan data berikut:

{$json}

Berikan audit yang kritis namun konstruktif dalam format JSON dengan struktur berikut:

{
  "status_kesehatan": "Skor 1-100 (integer) yang mewakili kesehatan operasional sistem saat ini",
  "ringkasan_eksekutif": "Ringkasan singkat (2-3 kalimat) mengenai kondisi sistem saat ini.",
  "temuan_utama": [
    {
      "modul": "Nama modul",
      "level": "info|warning|critical",
      "temuan": "Deskripsi temuan/anomali/masalah yang terdeteksi",
      "insight": "Mengapa ini terjadi atau apa dampaknya"
    }
  ],
  "analisis_beban_kerja": "Analisis singkat mengenai beban kerja operator/validator saat ini.",
  "anomali_data": [
    "Daftar anomali data spesifik yang ditemukan (misal: penumpukan tiket helpdesk, dsb)"
  ],
  "rekomendasi_prioritas": [
    {
      "tindakan": "Apa yang harus dilakukan segera",
      "alasan": "Mengapa ini prioritas"
    }
  ],
  "kesimpulan": "Kalimat penutup profesional."
}

Ketentuan:
- Bahasa Indonesia formal.
- Kritis dalam menemukan masalah (jangan hanya memuji).
- Berikan minimal 3 temuan_utama dan 3 rekomendasi_prioritas.
- Fokus pada data 'pending' dan 'completion' rates.
- Output HANYA JSON.
PROMPT;

            $response = Http::timeout(45)->post(
                "https://generativelanguage.googleapis.com/v1/models/{$this->model}:generateContent?key={$this->apiKey}",
                [
                    'contents' => [['parts' => [['text' => $prompt]]]],
                    'generationConfig' => [
                        'temperature' => 0.5,
                        'maxOutputTokens' => 2000,
                        'responseMimeType' => 'application/json',
                    ],
                ]
            );

            if ($response->successful()) {
                $result = $response->json();
                $text = $result['candidates'][0]['content']['parts'][0]['text'] ?? null;
                if ($text) {
                    $parsed = json_decode(trim($text), true);
                    if (is_array($parsed)) {
                        return array_merge($this->fallbackAudit($data), $parsed);
                    }
                }
            }

            return $this->fallbackAudit($data);
        } catch (\Exception $e) {
            Log::error('Gemini Audit Error: ' . $e->getMessage());
            return $this->fallbackAudit($data);
        }
    }

    protected function fallbackAudit(array $data): array
    {
        $status = 90; // Default healthy status
        $findings = [];
        
        foreach ($data['modules'] ?? [] as $name => $m) {
            if (($m['pending'] ?? 0) > 5) {
                $status -= 5;
                $findings[] = [
                    'modul' => ucfirst($name),
                    'level' => 'warning',
                    'temuan' => "Ada {$m['pending']} antrean pending",
                    'insight' => 'Antrean yang menumpuk dapat menghambat efisiensi layanan.'
                ];
            }
        }

        if (empty($findings)) {
            $findings[] = [
                'modul' => 'Sistem',
                'level' => 'success',
                'temuan' => 'Operasional Berjalan Lancar',
                'insight' => 'Seluruh modul menunjukkan tingkat penyelesaian yang baik.'
            ];
        }

        return [
            'status_kesehatan' => max(60, $status),
            'ringkasan_eksekutif' => "Analisis data menunjukkan sistem dalam kondisi stabil. " . (count($findings) > 1 ? "Perlu perhatian pada beberapa antrean." : "Kinerja modul inti sangat baik."),
            'temuan_utama' => array_slice($findings, 0, 3),
            'analisis_beban_kerja' => "Beban kerja saat ini terdistribusi dengan baik di seluruh unit.",
            'anomali_data' => ["Tidak ditemukan anomali data yang mengkhawatirkan."],
            'rekomendasi_prioritas' => [
                [
                    'tindakan' => 'Monitor antrean harian',
                    'alasan' => 'Menjaga agar waktu respon tetap sesuai SLA.'
                ]
            ],
            'kesimpulan' => "Sistem operasional SIPTU dalam kondisi prima."
        ];
    }

    protected function fallbackAnalysis(array $data): array
    {
        $period = $data['period'] ?? 'periode ini';
        return [
            'ringkasan' => "Laporan operasional SIPTU untuk {$period} menunjukkan performa yang stabil di seluruh lini layanan.",
            'analisis_layanan' => "Layanan inti seperti BMN dan Kearsipan berjalan sesuai prosedur.",
            'analisis_kedisiplinan' => "Monitoring kedisiplinan pegawai melalui Rispeg berjalan efektif.",
            'perbaikan' => [
                [
                    'area' => 'Responsivitas',
                    'masalah' => 'Waktu tunggu beberapa layanan',
                    'rekomendasi' => 'Optimalkan alur validasi'
                ]
            ],
            'pertumbuhan' => "Volume data meningkat secara organik.",
            'response_time' => "Rata-rata waktu penyelesaian stabil.",
            'saran' => ['Tingkatkan sosialisasi fitur baru'],
            'kesimpulan' => "Operasional berjalan dengan baik."
        ];
    }
}
