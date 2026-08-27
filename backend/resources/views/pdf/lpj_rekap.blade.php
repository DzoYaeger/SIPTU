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
    $showTransport = ($grandTransport ?? 0) > 0;
    $showFullboard = ($grandFullboard ?? 0) > 0;
    $showPenginapan = ($grandPenginapan ?? 0) > 0;
    $showUangHarian = ($grandUangHarian ?? 0) > 0;

    // Fallback if not passed from controller
    if (!$showTransport && !$showFullboard && !$showPenginapan && !$showUangHarian) {
        foreach ($processedItems as $itemData) {
            if (($itemData['transport'] ?? 0) > 0) $showTransport = true;
            if (($itemData['fullboard'] ?? 0) > 0) $showFullboard = true;
            if (($itemData['penginapan'] ?? 0) > 0) $showPenginapan = true;
            if (($itemData['uang_harian'] ?? 0) > 0) $showUangHarian = true;
        }
    }

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
                    $transport = $itemData['transport'] ?? (
                        ($item->uang_transport_bus ?? 0)
                        + ($item->uang_transport_taxi ?? 0)
                        + ($item->uang_transport_pesawat ?? 0)
                        + ($item->uang_transport_bbm ?? 0)
                        + ($item->uang_transport_sewa_mobil ?? 0)
                        + ($item->uang_transport_lokal ?? 0)
                        + ($item->uang_transport_umum ?? 0)
                    );
                    $fullboard = $itemData['fullboard'] ?? ($item->uang_fullboard ?? 0);
                    $penginapan = $itemData['penginapan'] ?? ($item->uang_penginapan ?? 0);
                    $uangHarian = $itemData['uang_harian'] ?? (($item->uang_harian ?? 0) + ($item->uang_harian_fullboard ?? 0));
                    $rowTotal = $itemData['total'] ?? ($transport + $fullboard + $penginapan + $uangHarian);
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
                        {{ $transport > 0 ? number_format($transport, 0, ',', '.') : '-' }}
                    </td>
                    @endif

                    @if($showFullboard)
                    <td class="text-right">
                        {{ $fullboard > 0 ? number_format($fullboard, 0, ',', '.') : '-' }}
                    </td>
                    @endif

                    @if($showPenginapan)
                    <td class="text-right">
                        {{ $penginapan > 0 ? number_format($penginapan, 0, ',', '.') : '-' }}
                    </td>
                    @endif

                    @if($showUangHarian)
                    <td class="text-right">
                        {{ $uangHarian > 0 ? number_format($uangHarian, 0, ',', '.') : '-' }}
                    </td>
                    @endif

                    <td class="text-right text-bold">{{ number_format($rowTotal, 0, ',', '.') }}</td>
                    <td></td>
                </tr>
            @endforeach
            <!-- Total Row -->
            <tr class="text-bold" style="background-color: #f2f2f2;">
                <td></td>
                <td colspan="11" style="text-align: left; padding: 6px 10px; font-size: 7.5pt; vertical-align: middle;">
                    Total &nbsp;|&nbsp; <span style="font-style: italic; font-weight: bold;">{{ $grandTerbilang }}</span>
                </td>
                @if($showTransport)
                <td class="text-right text-bold">
                    {{ $grandTransport > 0 ? number_format($grandTransport, 0, ',', '.') : '-' }}
                </td>
                @endif
                @if($showFullboard)
                <td class="text-right text-bold">
                    {{ $grandFullboard > 0 ? number_format($grandFullboard, 0, ',', '.') : '-' }}
                </td>
                @endif
                @if($showPenginapan)
                <td class="text-right text-bold">
                    {{ $grandPenginapan > 0 ? number_format($grandPenginapan, 0, ',', '.') : '-' }}
                </td>
                @endif
                @if($showUangHarian)
                <td class="text-right text-bold">
                    {{ $grandUangHarian > 0 ? number_format($grandUangHarian, 0, ',', '.') : '-' }}
                </td>
                @endif
                <td class="text-right text-bold">{{ number_format($grandTotal, 0, ',', '.') }}</td>
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
