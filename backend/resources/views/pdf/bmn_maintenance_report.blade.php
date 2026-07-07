<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Laporan Pemeliharaan & Keluhan BMN</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 10pt;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .header {
            text-align: center;
            margin-bottom: 25px;
            border-bottom: 2px solid #444;
            padding-bottom: 10px;
        }
        .header h1 {
            font-size: 16pt;
            margin: 0;
            text-transform: uppercase;
        }
        .header h2 {
            font-size: 13pt;
            margin: 5px 0 0;
            font-weight: normal;
        }
        .header p {
            font-size: 8pt;
            margin: 5px 0 0;
            color: #666;
            font-style: italic;
        }
        .info {
            margin-bottom: 15px;
            width: 100%;
        }
        .info td {
            padding: 2px 0;
        }
        table.data {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        table.data th {
            background-color: #1e40af;
            color: #ffffff;
            border: 1px solid #ccc;
            padding: 6px;
            text-align: center;
            font-size: 9pt;
        }
        table.data td {
            border: 1px solid #ccc;
            padding: 6px;
            font-size: 8.5pt;
            vertical-align: middle;
            word-wrap: break-word;
        }
        .footer {
            margin-top: 20px;
            width: 100%;
        }
        .footer-left {
            float: left;
            font-size: 8pt;
            color: #666;
        }
        .footer-right {
            float: right;
            text-align: left;
            font-size: 10pt;
            width: 200px;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .page-number:before { content: counter(page); }
    </style>
</head>
<body>
    <div class="header">
        <h1>Laporan Pemeliharaan & Keluhan BMN</h1>
        <h2>Balai POM di Palopo</h2>
        <p>JL. Dr. Ratulangi (Depan Taman Makam Pahlawan), Salobulo, Wara Utara, Kota Palopo, Sulawesi Selatan</p>
    </div>

    <table class="info">
        <tr>
            <td width="100">Kategori Jenis</td>
            <td width="10">:</td>
            <td><strong>{{ $typeLabel }}</strong></td>
        </tr>
        <tr>
            <td>Kategori Status</td>
            <td>:</td>
            <td><strong>{{ $statusLabel }}</strong></td>
        </tr>
        <tr>
            <td>Tanggal Cetak</td>
            <td>:</td>
            <td>{{ $date }}</td>
        </tr>
    </table>

    <table class="data">
        <thead>
            <tr>
                <th width="25">No</th>
                <th width="110">No. Laporan</th>
                <th width="70">Jenis</th>
                <th width="120">Aset BMN</th>
                <th>Permasalahan / Keluhan</th>
                <th width="120">Pelapor</th>
                <th width="70">Status</th>
                <th width="90">Tanggal</th>
            </tr>
        </thead>
        <tbody>
            @forelse($reports as $index => $report)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td class="text-center"><strong>{{ $report->report_number }}</strong></td>
                    <td class="text-center">{{ $report->report_type === 'pemeliharaan' ? 'Pemeliharaan' : 'Keluhan' }}</td>
                    <td>{{ $report->asset_name ?? '—' }}</td>
                    <td>{{ $report->report_details }}</td>
                    <td>
                        {{ $report->reporter_name ?? '—' }}<br>
                        <span style="font-size: 7.5pt; color: #666;">NIP. {{ $report->reporter_nip ?? '—' }}</span>
                    </td>
                    <td class="text-center">
                        @if($report->status === 'new')
                            Baru
                        @elseif($report->status === 'in_progress')
                            Diproses
                        @elseif($report->status === 'completed')
                            Selesai
                        @elseif($report->status === 'rejected')
                            Ditolak
                        @else
                            {{ $report->status }}
                        @endif
                    </td>
                    <td class="text-center">{{ $report->created_at ? $report->created_at->timezone('Asia/Makassar')->format('d/m/Y H:i') : '—' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8" class="text-center">Tidak ada data laporan pemeliharaan/keluhan BMN.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer" style="margin-top: 40px;">
        <div class="footer-left">
            Sistem Informasi Pelayanan Tata Usaha (SIPTU)
        </div>
        <div class="footer-right">
            Palopo, {{ \Carbon\Carbon::now()->timezone('Asia/Makassar')->translatedFormat('d F Y') }}<br>
            Mengetahui,<br>
            Pengelola BMN<br><br><br><br>
            <strong><u>Pengelola BMN</u></strong><br>
            Balai POM di Palopo
        </div>
    </div>
</body>
</html>
