<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Laporan Monitoring Kedisiplinan Pegawai - {{ $periodText ?? '' }}</title>
    <style>
        @page {
            margin: 1.2cm 1.5cm 1.5cm 1.5cm;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 9pt;
            color: #1e293b;
            line-height: 1.4;
        }
        .header-content {
            border-bottom: 3px double #1e3a8a;
            padding-bottom: 12px;
            margin-bottom: 16px;
            text-align: center;
        }
        .header-title {
            margin: 0;
            font-size: 15pt;
            font-weight: 800;
            color: #1e3a8a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .header-subtitle {
            margin: 3px 0 0 0;
            font-size: 10pt;
            font-weight: 600;
            color: #475569;
        }
        .header-org {
            margin: 2px 0 0 0;
            font-size: 8.5pt;
            color: #64748b;
        }
        
        .report-meta {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 14px;
            margin-bottom: 18px;
        }
        .report-meta table {
            width: 100%;
            border-collapse: collapse;
        }
        .report-meta td {
            border: none;
            padding: 2px 0;
            font-size: 9pt;
        }
        
        .summary-container {
            margin-bottom: 20px;
        }
        .section-title {
            background: #f1f5f9;
            padding: 6px 12px;
            font-weight: 700;
            color: #1e3a8a;
            border-left: 4px solid #2563eb;
            margin-bottom: 12px;
            font-size: 10pt;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .summary-cards {
            width: 100%;
            border-collapse: separate;
            border-spacing: 10px 0;
            margin: 0 -10px;
        }
        .summary-card {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px 12px;
            text-align: center;
            width: 33.33%;
            vertical-align: top;
        }
        .card-label {
            font-size: 7.5pt;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 700;
            margin-bottom: 4px;
            display: block;
        }
        .card-value {
            font-size: 13pt;
            font-weight: 800;
            color: #0f172a;
            margin: 4px 0;
        }
        .card-name {
            font-size: 8.5pt;
            color: #334155;
            font-weight: 600;
        }

        .content-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
            margin-top: 8px;
        }
        .content-table th {
            background-color: #1e3a8a;
            color: #ffffff;
            padding: 8px 4px;
            text-align: center;
            border: 1px solid #1e3a8a;
            text-transform: uppercase;
            font-size: 7.5pt;
            font-weight: 700;
        }
        .content-table td {
            padding: 6px 6px;
            border: 1px solid #cbd5e1;
            vertical-align: middle;
        }
        .content-table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .content-table tfoot td {
            background-color: #f1f5f9;
            font-weight: 700;
            border-top: 2px solid #1e3a8a;
        }
        
        .badge {
            display: inline-block;
            padding: 2px 7px;
            border-radius: 10px;
            font-size: 8pt;
            font-weight: 800;
            color: #ffffff;
            text-align: center;
        }
        .badge-danger { background-color: #ef4444; }
        .badge-warning { background-color: #f59e0b; }
        .badge-info { background-color: #3b82f6; }

        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: 700; }

        .signature-section {
            margin-top: 36px;
            width: 100%;
            page-break-inside: avoid;
        }
        .signature-box {
            float: right;
            width: 240px;
            text-align: center;
        }
        .signature-space {
            height: 60px;
        }
        
        .footer {
            position: fixed;
            bottom: 0px;
            left: 0px;
            right: 0px;
            height: 20px;
            font-size: 7.5pt;
            color: #94a3b8;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
        }
        
        .clearfix::after {
            content: "";
            clear: both;
            display: table;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header-content">
        <h1 class="header-title">Laporan Monitoring Kedisiplinan Pegawai</h1>
        <div class="header-subtitle">Rekapitulasi Pelanggaran Disiplin Kerja Pegawai</div>
        <div class="header-org">Sistem Informasi Pegawai dan Tata Usaha Terpadu (SIPTU)</div>
    </div>

    <!-- Report Metadata -->
    <div class="report-meta">
        <table>
            <tr>
                <td style="width: 16%; color: #475569;">Periode Laporan</td>
                <td style="width: 2%;">:</td>
                <td style="font-weight: 700; color: #1e3a8a;">{{ $periodText ?? '-' }}</td>
                <td style="text-align: right; color: #64748b; font-size: 8pt;">Dicetak pada: {{ date('d/m/Y H:i') }} WITA</td>
            </tr>
        </table>
    </div>

    <!-- Summary Cards (Only shown if data exists) -->
    @if(count($allStats) > 0)
    <div class="summary-container">
        <div class="section-title">Ringkasan Kinerja Kedisiplinan</div>
        <table class="summary-cards">
            <tr>
                <td class="summary-card">
                    <span class="card-label">Poin Pelanggaran Tertinggi</span>
                    <div class="card-value" style="color: #ef4444;">{{ $allStats[0]['total_points'] ?? 0 }} <span style="font-size: 8pt; font-weight: normal;">poin</span></div>
                    <div class="card-name">{{ $allStats[0]['name'] ?? '-' }}</div>
                </td>
                <td class="summary-card">
                    <span class="card-label">Frekuensi Terlambat Masuk</span>
                    <div class="card-value" style="color: #f59e0b;">{{ $allStats->sum('total_late_entries') }} <span style="font-size: 8pt; font-weight: normal;">kali</span></div>
                    <div class="card-name">Total {{ $allStats->sum('total_late_minutes') }} Menit</div>
                </td>
                <td class="summary-card">
                    <span class="card-label">Frekuensi Pulang Cepat</span>
                    <div class="card-value" style="color: #10b981;">{{ $allStats->sum('total_early_exits') }} <span style="font-size: 8pt; font-weight: normal;">kali</span></div>
                    <div class="card-name">Total {{ $allStats->sum('total_early_minutes') }} Menit</div>
                </td>
            </tr>
        </table>
    </div>
    @endif

    <!-- Main Table -->
    <div class="section-title">Detail Rekapitulasi Pelanggaran Pegawai</div>
    <table class="content-table">
        <thead>
            <tr>
                <th rowspan="2" style="width: 25px;">No</th>
                <th rowspan="2">Nama Pegawai / NIP</th>
                <th rowspan="2" style="width: 55px;">Total Poin Ticket</th>
                <th colspan="2">Terlambat Masuk</th>
                <th colspan="2">Pulang Cepat</th>
                <th colspan="2">Pelanggaran Lain</th>
            </tr>
            <tr>
                <th style="width: 38px;">Frekuensi</th>
                <th style="width: 45px;">Durasi</th>
                <th style="width: 38px;">Frekuensi</th>
                <th style="width: 45px;">Durasi</th>
                <th style="width: 45px;">Seragam</th>
                <th style="width: 45px;">Apel</th>
            </tr>
        </thead>
        <tbody>
            @forelse($allStats as $index => $stat)
            <tr>
                <td class="text-center">{{ $index + 1 }}</td>
                <td>
                    <div class="font-bold" style="color: #0f172a;">{{ $stat['name'] }}</div>
                    <div style="font-size: 7.5pt; color: #64748b;">NIP: {{ $stat['nip'] }}</div>
                </td>
                <td class="text-center">
                    @if($stat['total_points'] > 5)
                        <span class="badge badge-danger">{{ $stat['total_points'] }}</span>
                    @else
                        <span class="badge badge-warning">{{ $stat['total_points'] }}</span>
                    @endif
                </td>
                <td class="text-center">{{ $stat['total_late_entries'] > 0 ? $stat['total_late_entries'] . 'x' : '-' }}</td>
                <td class="text-center">{{ $stat['total_late_minutes'] > 0 ? $stat['total_late_minutes'] . 'm' : '-' }}</td>
                <td class="text-center">{{ $stat['total_early_exits'] > 0 ? $stat['total_early_exits'] . 'x' : '-' }}</td>
                <td class="text-center">{{ $stat['total_early_minutes'] > 0 ? $stat['total_early_minutes'] . 'm' : '-' }}</td>
                <td class="text-center">{{ $stat['total_uniform_violations'] > 0 ? $stat['total_uniform_violations'] . 'x' : '-' }}</td>
                <td class="text-center">{{ $stat['total_assembly_violations'] > 0 ? $stat['total_assembly_violations'] . 'x' : '-' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="9" class="text-center" style="padding: 24px; color: #64748b;">
                    <em>Tidak ada catatan pelanggaran disiplin pegawai untuk periode ini.</em>
                </td>
            </tr>
            @endforelse
        </tbody>
        @if(count($allStats) > 0)
        <tfoot>
            <tr>
                <td colspan="2" class="text-right" style="padding-right: 10px;">TOTAL KESELURUHAN</td>
                <td class="text-center" style="color: #ef4444;">{{ $allStats->sum('total_points') }}</td>
                <td class="text-center">{{ $allStats->sum('total_late_entries') }}x</td>
                <td class="text-center">{{ $allStats->sum('total_late_minutes') }}m</td>
                <td class="text-center">{{ $allStats->sum('total_early_exits') }}x</td>
                <td class="text-center">{{ $allStats->sum('total_early_minutes') }}m</td>
                <td class="text-center">{{ $allStats->sum('total_uniform_violations') }}x</td>
                <td class="text-center">{{ $allStats->sum('total_assembly_violations') }}x</td>
            </tr>
        </tfoot>
        @endif
    </table>

    <!-- Signature -->
    <div class="signature-section clearfix">
        <div class="signature-box">
            <p style="margin-bottom: 4px;">Palopo, {{ \Carbon\Carbon::now()->translatedFormat('d F Y') }}</p>
            <p style="font-weight: 600; margin-top: 0;">Penanggung Jawab,</p>
            <div class="signature-space"></div>
            <p class="font-bold" style="text-decoration: underline; margin-bottom: 2px;">Administrator Sistem</p>
            <p style="font-size: 8pt; color: #64748b; margin-top: 0;">SIPTU RISPEG Monitoring</p>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        Dokumen ini dibuat secara otomatis melalui Sistem Informasi Pegawai dan Tata Usaha Terpadu (SIPTU)
    </div>
</body>
</html>
