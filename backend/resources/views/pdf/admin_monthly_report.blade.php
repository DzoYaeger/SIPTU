<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>{{ $reportTitle }} SIPTU - {{ $periodName }}</title>
    <style>
        @page { margin: 1.5cm 1.5cm; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10pt; color: #1e293b; line-height: 1.5; }
        
        /* Typography & Layout */
        .header { border-bottom: 3px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 15px; text-align: center; }
        .header h1 { margin: 0; font-size: 15pt; color: #1e3a5f; text-transform: uppercase; letter-spacing: 1px; }
        .header h2 { margin: 2px 0 0; font-size: 11pt; color: #475569; font-weight: normal; }
        .header .sub { margin-top: 4px; font-size: 9pt; color: #94a3b8; }
        .meta-table { width: 100%; margin-bottom: 15px; font-size: 9pt; }
        .meta-table td { padding: 2px 0; border: none; }
        .meta-label { width: 120px; color: #64748b; }
        .meta-value { font-weight: bold; color: #1e293b; }
        
        .section-title { background: #1e3a5f; color: #ffffff; padding: 6px 12px; font-size: 11pt; font-weight: bold; border-radius: 4px; margin: 20px 0 10px; }
        .sub-title { font-size: 10pt; font-weight: bold; color: #1e3a5f; margin: 15px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        
        /* KPI & Content Blocks */
        .kpi-row { width: 100%; border-spacing: 6px 0; margin-bottom: 15px; }
        .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; width: 16.66%; }
        .kpi-label { font-size: 7.5pt; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px; }
        .kpi-value { font-size: 16pt; font-weight: 800; color: #1e3a5f; }
        .kpi-suffix { font-size: 7.5pt; color: #94a3b8; font-weight: normal; }
        
        /* Narrative Blocks */
        .ai-block { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 10px 14px; font-size: 9.5pt; line-height: 1.6; color: #334155; text-align: justify; margin-bottom: 10px; }
        .ai-block-green { border-left-color: #10b981; }
        .ai-block-orange { border-left-color: #f59e0b; }
        
        /* Lists */
        .action-list { margin: 0; padding-left: 20px; font-size: 9.5pt; color: #334155; line-height: 1.6; }
        .action-list li { margin-bottom: 4px; }
        
        /* Tables */
        .data-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 15px; }
        .data-table th { background: #1e3a5f; color: #fff; padding: 6px; text-align: center; border: 1px solid #2d5f8a; font-size: 8pt; text-transform: uppercase; }
        .data-table td { padding: 6px; border: 1px solid #e2e8f0; }
        .data-table tr:nth-child(even) { background: #f8fafc; }
        
        .improvement-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 15px; }
        .improvement-table th { background: #f1f5f9; color: #1e3a5f; padding: 6px; text-align: left; border: 1px solid #cbd5e1; }
        .improvement-table td { padding: 6px; border: 1px solid #e2e8f0; vertical-align: top; }
        
        /* Badges */
        .badge { display: inline-block; padding: 2px 6px; border-radius: 8px; font-size: 7.5pt; font-weight: bold; color: #fff; }
        .badge-danger { background: #dc2626; }
        .badge-warning { background: #f59e0b; color: #fff; }
        .badge-success { background: #16a34a; }
        
        /* Charts */
        .chart-container { margin: 15px 0; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #fff; }
        .bar-chart { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
        .bar-chart td { padding: 4px; vertical-align: middle; border: none; }
        .bar-label { width: 100px; font-weight: bold; color: #475569; text-align: right; padding-right: 10px !important; }
        .bar-value { width: 40px; text-align: left; padding-left: 10px !important; font-weight: bold; color: #1e3a5f; }
        .bar-wrap { width: auto; background: #f1f5f9; height: 16px; border-radius: 4px; overflow: hidden; position: relative; }
        .bar-fill { height: 100%; border-radius: 4px; }
        .fill-blue { background: #3b82f6; }
        
        /* Trend Chart */
        .trend-chart { width: 100%; border-collapse: collapse; height: 150px; font-size: 8pt; margin-top: 10px; }
        .trend-chart td { border: none; vertical-align: bottom; padding: 0 2px; text-align: center; }
        .trend-bar-container { height: 100px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; background: #f8fafc; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 4px; }
        .trend-col { width: 100%; display: inline-block; }
        .trend-bar { width: 80%; margin: 0 auto; background: #10b981; border-radius: 2px 2px 0 0; }
        .trend-label { color: #64748b; margin-top: 4px; display: block; }
        .trend-val { font-weight: bold; color: #1e3a5f; font-size: 7.5pt; margin-bottom: 2px; }
        
        /* Layout Utils */
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .clearfix::after { content: ""; clear: both; display: table; }
        .page-break { page-break-before: always; }
        .row { width: 100%; display: table; table-layout: fixed; margin-bottom: 15px; }
        .col-half { display: table-cell; width: 50%; padding-right: 10px; vertical-align: top; }
        
        .signature-section { margin-top: 30px; page-break-inside: avoid; }
        .signature-box { float: right; width: 240px; text-align: center; font-size: 9.5pt; }
        .signature-space { height: 60px; }
        .footer { position: fixed; bottom: 0; left: 0; right: 0; height: 20px; font-size: 7.5pt; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $reportTitle }}</h1>
        <h2>Sistem Informasi Pengelolaan Tata Usaha (SIPTU)</h2>
        <div class="sub">Balai Pengawas Obat dan Makanan di Palopo</div>
    </div>

    <table class="meta-table">
        <tr>
            <td class="meta-label">Periode Laporan</td>
            <td style="width: 10px;">:</td>
            <td class="meta-value">{{ $periodName }}</td>
            <td style="text-align: right; color: #94a3b8; font-size: 8pt;">Dicetak: {{ $printedAt }}</td>
        </tr>
        <tr>
            <td class="meta-label">Dicetak oleh</td>
            <td>:</td>
            <td class="meta-value">{{ $printedBy }}</td>
            <td></td>
        </tr>
    </table>

    {{-- I. OVERVIEW --}}
    <div class="section-title">I. RINGKASAN & PERFORMA</div>
    
    <table class="kpi-row">
        <tr>
            @foreach($kpis as $kpi)
            <td class="kpi-card">
                <span class="kpi-label">{{ $kpi['label'] }}</span>
                <div class="kpi-value">{{ number_format($kpi['value']) }} <span class="kpi-suffix">{{ $kpi['suffix'] }}</span></div>
            </td>
            @endforeach
        </tr>
    </table>

    <div class="ai-block">
        <strong>Overview:</strong> {{ $aiAnalysis['ringkasan'] ?? 'Tidak ada data ringkasan.' }}
    </div>
    <div class="ai-block ai-block-green">
        <strong>Pertumbuhan & Tren:</strong> {{ $aiAnalysis['pertumbuhan'] ?? 'Tidak ada data pertumbuhan.' }}
    </div>



    {{-- II. MODULE ANALYSIS --}}
    <div class="section-title">II. ANALISIS LAYANAN & WAKTU RESPON</div>
    
    <div class="ai-block">
        <strong>Analisis Modul:</strong> {{ $aiAnalysis['analisis_layanan'] ?? 'Tidak ada data.' }}
    </div>
    <div class="ai-block ai-block-orange">
        <strong>Waktu Respon (Response Time):</strong> {{ $aiAnalysis['response_time'] ?? 'Tidak ada data response time.' }}
    </div>

    <div class="sub-title">Status Layanan per Modul</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Modul</th>
                <th>Total</th>
                <th>Selesai</th>
                <th>%</th>
            </tr>
        </thead>
        <tbody>
            @foreach($modules as $mod)
            <tr>
                <td class="font-bold">{{ $mod['title'] }}</td>
                <td class="text-center">{{ $mod['total'] }}</td>
                <td class="text-center">{{ $mod['completed'] }}</td>
                <td class="text-center">{{ number_format($mod['completion'], 1) }}%</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    {{-- III. RISPEG & DISCIPLINE --}}
    @if(!empty($rispegStats) && count($rispegStats) > 0)
    <div class="section-title">III. KEDISIPLINAN PEGAWAI (RISPEG)</div>
    
    <div class="ai-block">
        <strong>Analisis Kedisiplinan:</strong> {{ $aiAnalysis['analisis_kedisiplinan'] ?? 'Tidak ada data.' }}
    </div>

    <table class="data-table">
        <thead>
            <tr>
                <th rowspan="2" style="width: 25px;">No</th>
                <th rowspan="2">Nama Pegawai</th>
                <th rowspan="2" style="width: 40px;">Poin</th>
                <th colspan="2">Terlambat</th>
                <th colspan="2">Plg Cepat</th>
                <th rowspan="2" style="width: 35px;">Seragam</th>
                <th rowspan="2" style="width: 35px;">Apel</th>
            </tr>
            <tr>
                <th style="width: 35px;">Kali</th>
                <th style="width: 35px;">Mnt</th>
                <th style="width: 35px;">Kali</th>
                <th style="width: 35px;">Mnt</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rispegStats as $idx => $stat)
            <tr>
                <td class="text-center">{{ $idx + 1 }}</td>
                <td class="font-bold">{{ $stat['name'] }}</td>
                <td class="text-center">
                    @if($stat['total_points'] > 5)
                        <span class="badge badge-danger">{{ $stat['total_points'] }}</span>
                    @else
                        <span class="badge badge-warning">{{ $stat['total_points'] }}</span>
                    @endif
                </td>
                <td class="text-center">{{ $stat['total_late_entries'] }}</td>
                <td class="text-center">{{ $stat['total_late_minutes'] }}</td>
                <td class="text-center">{{ $stat['total_early_exits'] }}</td>
                <td class="text-center">{{ $stat['total_early_minutes'] }}</td>
                <td class="text-center">{{ $stat['total_uniform_violations'] }}</td>
                <td class="text-center">{{ $stat['total_assembly_violations'] }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    @endif

    <div class="page-break"></div>

    {{-- IV. IMPROVEMENTS & RECOMMENDATIONS --}}
    <div class="section-title">IV. EVALUASI & REKOMENDASI TINDAKAN</div>

    <div class="sub-title">Area yang Memerlukan Perbaikan</div>
    @if(!empty($aiAnalysis['perbaikan']) && is_array($aiAnalysis['perbaikan']))
    <table class="improvement-table">
        <thead>
            <tr>
                <th style="width: 25%;">Area / Modul</th>
                <th style="width: 35%;">Identifikasi Masalah</th>
                <th style="width: 40%;">Rekomendasi Tindakan</th>
            </tr>
        </thead>
        <tbody>
            @foreach($aiAnalysis['perbaikan'] as $perbaikan)
            <tr>
                <td class="font-bold">{{ $perbaikan['area'] ?? '-' }}</td>
                <td>{{ $perbaikan['masalah'] ?? '-' }}</td>
                <td>{{ $perbaikan['rekomendasi'] ?? '-' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @else
    <p style="font-size: 9pt; color: #64748b;">Tidak ada area spesifik yang diidentifikasi untuk perbaikan ekstensif bulan ini.</p>
    @endif

    <div class="sub-title">Saran Peningkatan Operasional</div>
    @if(!empty($aiAnalysis['saran']) && is_array($aiAnalysis['saran']))
    <ul class="action-list">
        @foreach($aiAnalysis['saran'] as $saran)
        <li>{{ $saran }}</li>
        @endforeach
    </ul>
    @endif

    <div class="sub-title">Kesimpulan Akhir</div>
    <div class="ai-block" style="border-left-color: #6366f1;">
        {{ $aiAnalysis['kesimpulan'] ?? 'Operasional bulan ini berjalan sesuai rencana.' }}
    </div>

    {{-- SIGNATURE --}}
    <div class="signature-section clearfix">
        <div class="signature-box">
            <p>Palopo, {{ $signatureDate }}</p>
            <p>Penanggung Jawab Operasional,</p>
            <div class="signature-space"></div>
            <p class="font-bold" style="text-decoration: underline;">{{ $printedBy }}</p>
            <p style="font-size: 8pt; color: #64748b;">Administrator Sistem SIPTU</p>
        </div>
    </div>

    <div class="footer">
        Dokumen ini dicetak secara otomatis oleh Sistem Informasi Pengelolaan Tata Usaha (SIPTU) &mdash; Balai Pengawas Obat dan Makanan di Palopo
    </div>
</body>
</html>
