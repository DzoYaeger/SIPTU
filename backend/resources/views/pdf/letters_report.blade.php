<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Laporan Pencatatan Surat {{ ucfirst($type) }}</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 11pt;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #444;
            padding-bottom: 10px;
        }
        .header h1 {
            font-size: 18pt;
            margin: 0;
            text-transform: uppercase;
        }
        .header h2 {
            font-size: 14pt;
            margin: 5px 0 0;
            font-weight: normal;
        }
        .info {
            margin-bottom: 20px;
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
            background-color: #f2f2f2;
            border: 1px solid #ccc;
            padding: 8px;
            text-align: center;
            font-size: 10pt;
        }
        table.data td {
            border: 1px solid #ccc;
            padding: 8px;
            font-size: 9pt;
            vertical-align: top;
            word-wrap: break-word;
        }
        .footer {
            margin-top: 30px;
            text-align: right;
            font-size: 10pt;
        }
        .text-center { text-align: center; }
        .page-number:before { content: counter(page); }
    </style>
</head>
<body>
    <div class="header">
        <h1>Laporan Pencatatan Surat {{ ucfirst($type) }}</h1>
        <h2>Balai POM di Palopo</h2>
    </div>

    <table class="info">
        <tr>
            <td width="120">Unit Kerja</td>
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
            @if($type === 'masuk')
                <tr>
                    <th width="30">No</th>
                    <th width="120">Nomor Surat</th>
                    <th>Hal / Perihal</th>
                    <th width="80">Tgl. Surat</th>
                    <th width="120">Instansi Pengirim</th>
                    <th width="100">Penerima</th>
                    <th width="80">Tgl. Terima</th>
                </tr>
            @else
                <tr>
                    <th width="30">No</th>
                    <th width="120">Nomor Surat</th>
                    <th>Hal / Perihal</th>
                    <th width="80">Tgl. Surat</th>
                    <th width="120">Tujuan</th>
                    <th width="100">Pengirim</th>
                    <th width="80">Tgl. Kirim</th>
                </tr>
            @endif
        </thead>
        <tbody>
            @forelse($letters as $index => $letter)
                @if($type === 'masuk')
                    <tr>
                        <td class="text-center">{{ $index + 1 }}</td>
                        <td>{{ $letter->nomor_surat ?? '—' }}</td>
                        <td>{{ $letter->hal ?? '—' }}</td>
                        <td class="text-center">{{ $letter->tanggal_surat ? $letter->tanggal_surat->format('d/m/Y') : '—' }}</td>
                        <td>{{ $letter->instansi_pengirim ?? '—' }}</td>
                        <td>{{ $letter->penerima ?? '—' }}</td>
                        <td class="text-center">{{ $letter->tanggal_terima ? $letter->tanggal_terima->format('d/m/Y') : '—' }}</td>
                    </tr>
                @else
                    <tr>
                        <td class="text-center">{{ $index + 1 }}</td>
                        <td>{{ $letter->nomor_surat ?? '—' }}</td>
                        <td>{{ $letter->hal ?? '—' }}</td>
                        <td class="text-center">{{ $letter->tanggal_surat ? $letter->tanggal_surat->format('d/m/Y') : '—' }}</td>
                        <td>{{ $letter->tujuan ?? '—' }}</td>
                        <td>{{ $letter->pengirim ?? '—' }}</td>
                        <td class="text-center">{{ $letter->tanggal_kirim ? $letter->tanggal_kirim->format('d/m/Y') : '—' }}</td>
                    </tr>
                @endif
            @empty
                <tr>
                    <td colspan="7" class="text-center">Tidak ada data surat {{ $type }}.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        Dicetak pada: {{ now()->format('d/m/Y H:i:s') }}
    </div>
</body>
</html>
