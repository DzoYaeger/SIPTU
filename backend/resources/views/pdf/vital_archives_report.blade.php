<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Laporan Pencatatan Arsip Vital</title>
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
            font-size: 12pt;
            margin: 5px 0 0;
            font-weight: normal;
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
            background-color: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 8px 4px;
            text-align: center;
            font-size: 9pt;
            text-transform: uppercase;
        }
        table.data td {
            border: 1px solid #cbd5e1;
            padding: 6px 4px;
            font-size: 8.5pt;
            vertical-align: top;
            word-wrap: break-word;
        }
        .footer {
            margin-top: 20px;
            text-align: right;
            font-size: 9pt;
            color: #64748b;
        }
        .text-center { text-align: center; }
        .page-number:before { content: counter(page); }
    </style>
</head>
<body>
    <div class="header">
        <h1>Laporan Pencatatan Arsip Vital</h1>
        <h2>Balai POM di Palopo</h2>
    </div>

    <table class="info">
        <tr>
            <td width="100">Unit Pengolah</td>
            <td width="10">:</td>
            <td><strong>{{ $unitName }}</strong></td>
        </tr>
        <tr>
            <td>Tanggal Laporan</td>
            <td>:</td>
            <td>{{ $date }}</td>
        </tr>
    </table>

    <table class="data">
        <thead>
            <tr>
                <th width="25">No</th>
                <th width="120">Jenis Arsip</th>
                <th width="80">Kurun Waktu</th>
                <th width="100">Media</th>
                <th width="60">Jumlah</th>
                <th width="120">Jangka Simpan</th>
                <th width="120">Metode Perlindungan</th>
                <th>Lokasi Simpan</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data as $index => $item)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>{{ $item['jenis_arsip'] }}</td>
                    <td class="text-center">{{ $item['kurun_waktu'] }}</td>
                    <td>{{ $item['media'] }}</td>
                    <td class="text-center">{{ $item['jumlah'] }}</td>
                    <td>{{ $item['jangka_simpan'] }}</td>
                    <td>{{ $item['metode_perlindungan'] }}</td>
                    <td>{{ $item['lokasi_simpan'] }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8" class="text-center">Tidak ada data arsip vital.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        Dicetak pada: {{ now()->format('d/m/Y H:i:s') }}
    </div>
</body>
</html>
