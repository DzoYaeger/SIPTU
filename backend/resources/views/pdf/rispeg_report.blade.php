<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Laporan Monitoring Kedisiplinan Pegawai - {{ $monthName }} {{ $year }}</title>
    <style>
        @page {
            margin: 1.5cm;
            footer: html_reportFooter;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 10pt;
            color: #333;
            line-height: 1.4;
        }
        .header-content {
            border-bottom: 2px solid #2c3e50;
            padding-bottom: 10px;
            margin-bottom: 20px;
            display: table;
            width: 100%;
        }
        .header-logo {
            display: table-cell;
            width: 80px;
            vertical-align: middle;
        }
        .header-text {
            display: table-cell;
            vertical-align: middle;
            text-align: center;
        }
        .header-text h1 {
            margin: 0;
            font-size: 16pt;
            color: #2c3e50;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .header-text p {
            margin: 2px 0;
            font-size: 10pt;
            color: #7f8c8d;
        }
        
        .report-meta {
            margin-bottom: 20px;
        }
        .report-meta table {
            width: 100%;
        }
        .report-meta td {
            border: none;
            padding: 2px 0;
        }
        
        .summary-container {
            margin-bottom: 30px;
        }
        .summary-title {
            background-color: #ecf0f1;
            padding: 8px 12px;
            font-weight: bold;
            color: #2c3e50;
            border-left: 4px solid #3498db;
            margin-bottom: 15px;
            font-size: 11pt;
        }
        
        .summary-cards {
            width: 100%;
            border-spacing: 15px 0;
            margin: 0 -15px;
        }
        .summary-card {
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            width: 33.33%;
        }
        .card-label {
            font-size: 8pt;
            color: #7f8c8d;
            text-transform: uppercase;
            margin-bottom: 5px;
            display: block;
        }
        .card-value {
            font-size: 14pt;
            font-weight: bold;
            color: #2c3e50;
            margin: 5px 0;
        }
        .card-name {
            font-size: 9pt;
            color: #34495e;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .content-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
        }
        .content-table th {
            background-color: #2c3e50;
            color: #ffffff;
            padding: 10px 5px;
            text-align: center;
            border: 1px solid #34495e;
            text-transform: uppercase;
            font-size: 8pt;
        }
        .content-table td {
            padding: 8px 5px;
            border: 1px solid #e0e0e0;
        }
        .content-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 8pt;
            font-weight: bold;
            color: #fff;
        }
        .badge-danger { background-color: #e74c3c; }
        .badge-success { background-color: #27ae60; }
        .badge-warning { background-color: #f39c12; color: #fff; }

        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }

        .signature-section {
            margin-top: 50px;
            width: 100%;
            page-break-inside: avoid;
        }
        .signature-box {
            float: right;
            width: 250px;
            text-align: center;
        }
        .signature-space {
            height: 70px;
        }
        
        .footer {
            position: fixed;
            bottom: 0px;
            left: 0px;
            right: 0px;
            height: 30px;
            font-size: 8pt;
            color: #bdc3c7;
            text-align: center;
            border-top: 1px solid #ecf0f1;
            padding-top: 10px;
        }
        
        .clearfix::after {
            content: "";
            clear: both;
            display: table;
        }
    </style>
</head>
<body>
    <div class="header-content">
        <div class="header-text">
            <h1>Laporan Monitoring Kedisiplinan Pegawai</h1>
            <p>Sistem Informasi Pegawai dan Tata Usaha Terpadu (SIPTU)</p>
        </div>
    </div>

    <div class="report-meta">
        <table>
            <tr>
                <td style="width: 15%">Periode Laporan</td>
                <td style="width: 2%">:</td>
                <td style="font-weight: bold;">{{ $monthName }} {{ $year }}</td>
                <td style="text-align: right; color: #7f8c8d; font-size: 8pt;">Dicetak pada: {{ date('d/m/Y H:i') }}</td>
            </tr>
        </table>
    </div>

    <div class="summary-container">
        <div class="summary-title">RINGKASAN KINERJA BULANAN</div>
        <table class="summary-cards">
            <tr>
                <td class="summary-card">
                    <span class="card-label">Akumulasi Ticket Pelanggaran Tertinggi</span>
                    <div class="card-value">{{ $summary['top_points']['total_points'] ?? 0 }}</div>
                    <div class="card-name">{{ $summary['top_points']['name'] ?? '-' }}</div>
                </td>
                <td class="summary-card">
                    <span class="card-label">Frekuensi Terlambat</span>
                    <div class="card-value">{{ $summary['most_late_entries']['total_late_entries'] ?? 0 }} <span style="font-size: 9pt; font-weight: normal;">kali</span></div>
                    <div class="card-name">{{ $summary['most_late_entries']['name'] ?? '-' }}</div>
                </td>
                <td class="summary-card">
                    <span class="card-label">Frekuensi Pulang Cepat</span>
                    <div class="card-value">{{ $summary['most_early_exits']['total_early_exits'] ?? 0 }} <span style="font-size: 9pt; font-weight: normal;">kali</span></div>
                    <div class="card-name">{{ $summary['most_early_exits']['name'] ?? '-' }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="summary-title">DETAIL REKAPITULASI PELANGGARAN PEGAWAI</div>
    <table class="content-table">
        <thead>
            <tr>
                <th rowspan="2" style="width: 30px;">No</th>
                <th rowspan="2">Nama Pegawai / NIP</th>
                <th rowspan="2" style="width: 50px;">Total Ticket Pelanggaran</th>
                <th colspan="2">Keterlambatan</th>
                <th colspan="2">Pulang Cepat</th>
                <th colspan="2">Pelanggaran Lain</th>
            </tr>
            <tr>
                <th style="width: 40px;">Freq</th>
                <th style="width: 40px;">Dur (m)</th>
                <th style="width: 40px;">Freq</th>
                <th style="width: 40px;">Dur (m)</th>
                <th style="width: 40px;">Seragam</th>
                <th style="width: 40px;">Apel</th>
            </tr>
        </thead>
        <tbody>
            @forelse($allStats as $index => $stat)
            <tr>
                <td class="text-center">{{ $index + 1 }}</td>
                <td>
                    <div class="font-bold">{{ $stat['name'] }}</div>
                    <div style="font-size: 8pt; color: #7f8c8d;">NIP: {{ $stat['nip'] }}</div>
                </td>
                <td class="text-center">
                    @if($stat['total_points'] > 5)
                        <span class="badge badge-danger">{{ $stat['total_points'] }}</span>
                    @elseif($stat['total_points'] > 0)
                        <span class="badge badge-warning">{{ $stat['total_points'] }}</span>
                    @else
                        <span class="badge badge-success">0</span>
                    @endif
                </td>
                <td class="text-center">{{ $stat['total_late_entries'] }}</td>
                <td class="text-center">{{ $stat['total_late_minutes'] }}</td>
                <td class="text-center">{{ $stat['total_early_exits'] }}</td>
                <td class="text-center">{{ $stat['total_early_minutes'] }}</td>
                <td class="text-center">{{ $stat['total_uniform_violations'] }}</td>
                <td class="text-center">{{ $stat['total_assembly_violations'] }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="9" class="text-center" style="padding: 20px;">Tidak ada data pelanggaran untuk periode ini.</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <div class="signature-section clearfix">
        <div class="signature-box">
            <p>{{ date('d') }} {{ $monthName }} {{ $year }}</p>
            <p>Penanggung Jawab,</p>
            <div class="signature-space"></div>
            <p class="font-bold" style="text-decoration: underline;">Administrator Sistem</p>
            <p>NIP. .........................</p>
        </div>
    </div>

    <div class="footer">
        Laporan ini dihasilkan secara otomatis oleh Sistem Iformasi Pegawai dan Tata Usaha Terpadu (SIPTU)
    </div>
</body>
</html>
