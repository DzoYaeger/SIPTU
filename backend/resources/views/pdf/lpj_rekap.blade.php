<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rekapitulasi Daftar Nominatif</title>
    <style>
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 9pt;
            color: #000;
            line-height: 1.4;
            margin: 0;
            padding: 0;
        }
        @page {
            size: 330mm 215mm;
            margin: 1.2cm 0.7cm;
        }
        .nominatif-header {
            font-size: 10.5pt;
            font-weight: bold;
            line-height: 1.4;
            margin-bottom: 15px;
        }
        .nominatif-table {
            width: 100%;
            border-collapse: collapse;
            border: 1.5px solid #000;
            font-size: 7.5pt;
            margin-bottom: 20px;
        }
        .nominatif-table th {
            border: 1px solid #000;
            border-bottom: 1.5px solid #000;
            padding: 6px 3px;
            font-weight: bold;
            text-align: center;
            vertical-align: middle;
            background-color: #f2f2f2;
        }
        .nominatif-table td {
            border: 1px solid #000;
            padding: 5px 4px;
            vertical-align: middle;
        }
        .text-center {
            text-align: center;
        }
        .text-right {
            text-align: right;
        }
        .text-bold {
            font-weight: bold;
        }
        .text-italic {
            font-style: italic;
        }
    </style>
</head>
<body>

@php
    $showTransport = false;
    $showFullboard = false;
    $showPenginapan = false;
    $showUangHarian = false;

    foreach ($processedItems as $itemData) {
        $item = $itemData['item'];
        $transport = ($item->uang_transport_bus ?? 0)
            + ($item->uang_transport_taxi ?? 0)
            + ($item->uang_transport_pesawat ?? 0)
            + ($item->uang_transport_bbm ?? 0)
            + ($item->uang_transport_sewa_mobil ?? 0);
        $fullboard = $item->uang_fullboard ?? 0;
        $penginapan = $item->uang_penginapan ?? 0;
        $uangHarian = ($item->uang_harian ?? 0) + ($item->uang_harian_fullboard ?? 0);

        if ($transport > 0) $showTransport = true;
        if ($fullboard > 0) $showFullboard = true;
        if ($penginapan > 0) $showPenginapan = true;
        if ($uangHarian > 0) $showUangHarian = true;
    }

    // There are 12 static columns before dynamic ones.
    // The first column 'No' has its own <td>.
    // So the second merged <td> needs to span (12 - 1) + shown dynamic columns.
    $colspanTerbilang = 11
        + ($showTransport ? 1 : 0) 
        + ($showFullboard ? 1 : 0) 
        + ($showPenginapan ? 1 : 0) 
        + ($showUangHarian ? 1 : 0);

    // Define base weights for visible columns
    $baseWidths = [
        'no' => 2.5,
        'nama' => 11.5,
        'akun' => 8.5,
        'pangkat' => 6.5,
        'tujuan' => 8.0,
        'tgl_berangkat' => 5.5,
        'tgl_pulang' => 5.5,
        'lama' => 2.5,
        'no_st' => 10.5,
        'tgl_st' => 5.0,
        'no_sppd' => 10.5,
        'tgl_sppd' => 5.0,
        'total' => 7.0,
        'ket' => 1.5,
    ];

    $dynamicWidths = [];
    if ($showTransport) $dynamicWidths['transport'] = 5.0;
    if ($showFullboard) $dynamicWidths['fullboard'] = 5.0;
    if ($showPenginapan) $dynamicWidths['penginapan'] = 5.0;
    if ($showUangHarian) $dynamicWidths['uang_harian'] = 5.0;

    $totalBase = array_sum($baseWidths) + array_sum($dynamicWidths);

    // Normalize so that they sum to exactly 100%
    $w = [];
    foreach ($baseWidths as $key => $val) {
        $w[$key] = ($val / $totalBase) * 100;
    }
    foreach ($dynamicWidths as $key => $val) {
        $w[$key] = ($val / $totalBase) * 100;
    }
@endphp

<div class="landscape-section">
    <div class="nominatif-header">
        UNIT ORGANISASI : BALAI POM DI PALOPO<br>
        REKAPITULASI DAFTAR NOMINATIF BIAYA PERJALANAN DINAS LUAR KOTA<br>
        BULAN {{ strtoupper(\Carbon\Carbon::parse($lpj->created_at ?? now())->translatedFormat('F Y')) }}
    </div>

    <table class="nominatif-table">
        <thead>
            <tr>
                <th style="width: {{ $w['no'] }}%;">No.</th>
                <th style="width: {{ $w['nama'] }}%;">Nama Petugas</th>
                <th style="width: {{ $w['akun'] }}%;">Kode Akun</th>
                <th style="width: {{ $w['pangkat'] }}%;">Pangkat/<br>Golongan</th>
                <th style="width: {{ $w['tujuan'] }}%;">Tujuan</th>
                <th style="width: {{ $w['tgl_berangkat'] }}%;">Tanggal<br>Berangkat</th>
                <th style="width: {{ $w['tgl_pulang'] }}%;">Tanggal<br>Pulang</th>
                <th style="width: {{ $w['lama'] }}%;">Lama<br>(Hari)</th>
                <th style="width: {{ $w['no_st'] }}%;">Nomor Surat Tugas</th>
                <th style="width: {{ $w['tgl_st'] }}%;">Tanggal<br>ST</th>
                <th style="width: {{ $w['no_sppd'] }}%;">Nomor SPPD</th>
                <th style="width: {{ $w['tgl_sppd'] }}%;">Tanggal<br>SPPD</th>
                @if($showTransport) <th style="width: {{ $w['transport'] }}%;">Transport<br>(Rp)</th> @endif
                @if($showFullboard) <th style="width: {{ $w['fullboard'] }}%;">Paket Fullboard<br>(Rp)</th> @endif
                @if($showPenginapan) <th style="width: {{ $w['penginapan'] }}%;">Penginapan<br>(Rp)</th> @endif
                @if($showUangHarian) <th style="width: {{ $w['uang_harian'] }}%;">Uang Harian<br>(Rp)</th> @endif
                <th style="width: {{ $w['total'] }}%;">Total<br>(Rp)</th>
                <th style="width: {{ $w['ket'] }}%;">Ket.</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($processedItems as $index => $itemData)
                @php
                    $item = $itemData['item'];
                    $transport = ($item->uang_transport_bus ?? 0)
                        + ($item->uang_transport_taxi ?? 0)
                        + ($item->uang_transport_pesawat ?? 0)
                        + ($item->uang_transport_bbm ?? 0)
                        + ($item->uang_transport_sewa_mobil ?? 0);
                    $fullboard = $item->uang_fullboard ?? 0;
                    $penginapan = $item->uang_penginapan ?? 0;
                    $uangHarian = ($item->uang_harian ?? 0) + ($item->uang_harian_fullboard ?? 0);
                    $duration = $st->tanggal_mulai && $st->tanggal_selesai ? \Carbon\Carbon::parse($st->tanggal_mulai)->diffInDays(\Carbon\Carbon::parse($st->tanggal_selesai)) + 1 : 0;
                @endphp
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>{{ $item->employee_name }}</td>
                    <td class="text-center">{{ $st->mak ?? '-' }}</td>
                    <td class="text-center">{{ $itemData['pangkat'] ?? '-' }}</td>
                    <td>{{ $st->lokasi_tugas }}</td>
                    <td class="text-center">{{ $st->tanggal_mulai ? \Carbon\Carbon::parse($st->tanggal_mulai)->format('d/m/Y') : '-' }}</td>
                    <td class="text-center">{{ $st->tanggal_selesai ? \Carbon\Carbon::parse($st->tanggal_selesai)->format('d/m/Y') : '-' }}</td>
                    <td class="text-center">{{ $duration }}</td>
                    <td>{{ $st->nomor_st }}</td>
                    <td class="text-center">{{ $st->tanggal_st ? \Carbon\Carbon::parse($st->tanggal_st)->format('d/m/Y') : '-' }}</td>
                    <td>{{ $item->nomor_spd }}</td>
                    <td class="text-center">{{ $st->tanggal_st ? \Carbon\Carbon::parse($st->tanggal_st)->format('d/m/Y') : '-' }}</td>
                    
                    @if($showTransport)
                    <td class="text-right">
                        @if ($transport > 0)
                            {{ number_format($transport, 0, ',', '.') }}
                        @else
                            -
                        @endif
                    </td>
                    @endif

                    @if($showFullboard)
                    <td class="text-right">
                        @if ($fullboard > 0)
                            {{ number_format($fullboard, 0, ',', '.') }}
                        @else
                            -
                        @endif
                    </td>
                    @endif

                    @if($showPenginapan)
                    <td class="text-right">
                        @if ($penginapan > 0)
                            {{ number_format($penginapan, 0, ',', '.') }}
                        @else
                            -
                        @endif
                    </td>
                    @endif

                    @if($showUangHarian)
                    <td class="text-right">
                        @if ($uangHarian > 0)
                            {{ number_format($uangHarian, 0, ',', '.') }}
                        @else
                            -
                        @endif
                    </td>
                    @endif

                    <td class="text-right text-bold">{{ number_format($itemData['total'], 0, ',', '.') }}</td>
                    <td></td>
                </tr>
            @endforeach
            <!-- Total Row -->
            <tr class="text-bold">
                <td></td>
                <td colspan="{{ $colspanTerbilang }}" style="text-align: left; padding: 6px 10px; font-size: 7.5pt; vertical-align: middle;">
                    Total &nbsp;|&nbsp; <span style="font-style: italic; font-weight: bold;">{{ $grandTerbilang }}</span>
                </td>
                <td class="text-right">{{ number_format($grandTotal, 0, ',', '.') }}</td>
                <td></td>
            </tr>
        </tbody>
    </table>

    <div style="width: 100%; margin-top: 25px;">
        <div style="width: 35%; float: right; text-align: left; line-height: 1.4; font-size: 8.5pt;">
            Palopo, {{ $printDate }}<br>
            Pejabat Pembuat Komitmen,<br><br><br><br><br>
            <span class="text-bold" style="text-decoration: underline;">{{ $ppkName }}</span><br>
            NIP. {{ $ppkNip }}
        </div>
        <div style="clear: both;"></div>
    </div>
</div>

</body>
</html>
