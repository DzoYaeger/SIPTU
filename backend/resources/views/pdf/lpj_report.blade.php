<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rincian Biaya Perjalanan Dinas</title>
    <style>
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 10pt;
            color: #000;
            line-height: 1.4;
            margin: 0;
            padding: 0;
        }
        @page {
            size: 215mm 330mm;
            margin: 1.2cm 1.5cm;
        }
        .title {
            text-align: center;
            font-size: 12pt;
            font-weight: bold;
            text-decoration: underline;
            text-transform: uppercase;
            margin-bottom: 20px;
        }
        .metadata-table {
            width: 100%;
            margin-bottom: 15px;
            font-size: 10pt;
            border-collapse: collapse;
        }
        .metadata-table td {
            padding: 2px 0;
            border: none;
        }
        .main-table {
            width: 100%;
            border-collapse: collapse;
            border: 1.5px solid #000;
            margin-bottom: 15px;
        }
        .main-table th {
            border: 1px solid #000;
            border-bottom: 1.5px solid #000;
            padding: 8px 5px;
            font-weight: bold;
            font-size: 9.5pt;
            text-transform: uppercase;
            background-color: #f9f9f9;
        }
        .main-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            vertical-align: top;
            font-size: 9.5pt;
        }
        .sub-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
        }
        .sub-table td {
            border: none;
            padding: 2px 0;
            font-size: 9.5pt;
        }
        .terbilang-box {
            border: 1px solid #000;
            padding: 8px 10px;
            margin-bottom: 25px;
            font-size: 10pt;
        }
        .signatures-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .signatures-table td {
            border: none;
            width: 50%;
            vertical-align: top;
        }
        .signature-container {
            min-height: 70px;
        }
        .rampung-section {
            border-top: 1.5px solid #000;
            padding-top: 15px;
            margin-top: 20px;
        }
        .rampung-title {
            text-align: center;
            font-weight: bold;
            font-size: 10.5pt;
            text-transform: uppercase;
            margin-bottom: 10px;
            letter-spacing: 0.5px;
        }
        .rampung-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5pt;
        }
        .rampung-table td {
            border: none;
            padding: 3px 0;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-bold { font-weight: bold; }
        .text-italic { font-style: italic; }
    </style>
</head>
<body>

@foreach($processedItems as $index => $itemData)
    @if($index > 0)
        <div style="page-break-before: always;"></div>
    @endif

    <div class="title">Rincian Biaya Perjalanan Dinas</div>

    <table class="metadata-table">
        <tr>
            <td style="width: 150px;">Lampiran SPD Nomor</td>
            <td style="width: 15px;">:</td>
            <td>{{ $itemData['item']->nomor_spd ?: '-' }}</td>
        </tr>
        <tr>
            <td>Tanggal</td>
            <td>:</td>
            <td>{{ $spdDate }}</td>
        </tr>
    </table>

    <table class="main-table">
        <thead>
            <tr>
                <th style="width: 28px;" class="text-center">No.</th>
                <th class="text-left" style="padding-left: 8px;">Perincian Biaya</th>
                <th style="width: 110px;" class="text-center">Jumlah</th>
                <th style="width: 200px;" class="text-center">Keterangan</th>
            </tr>
        </thead>
        <tbody>
            @foreach($itemData['rows'] as $row)
                @if(empty($row['breakdown']))
                    <tr>
                        <td class="text-center" style="vertical-align: top; padding: 6px 4px;">{{ $row['no'] }}.</td>
                        <td style="vertical-align: top; padding: 6px 8px; line-height: 1.4;">{{ $row['title'] }}</td>
                        <td class="text-right" style="vertical-align: top; padding: 6px 8px; white-space: nowrap; line-height: 1.4;">
                            Rp {{ number_format($row['total'], 0, ',', '.') }}
                        </td>
                        <td style="vertical-align: top; padding: 6px 8px; text-align: left; font-size: 9pt; line-height: 1.4;">
                            {{ $row['keterangan'] }}
                        </td>
                    </tr>
                @else
                    {{-- Baris 1: Header Judul Komponen --}}
                    <tr>
                        <td rowspan="{{ count($row['breakdown']) + 1 }}" class="text-center" style="vertical-align: top; padding: 6px 4px;">{{ $row['no'] }}.</td>
                        <td class="text-bold" style="border-bottom: none; padding: 6px 8px 2px 8px; line-height: 1.4;">{{ $row['title'] }}</td>
                        <td class="text-right" style="border-bottom: none; padding: 6px 8px 2px 8px;"></td>
                        <td style="border-bottom: none; padding: 6px 8px 2px 8px;"></td>
                    </tr>
                    {{-- Baris-baris Sub-item: Setiap rincian, nominal, dan keterangan berada di tr yang sama --}}
                    @foreach($row['breakdown'] as $bdIndex => $bd)
                        <tr>
                            <td style="border-top: none; {{ $loop->last ? '' : 'border-bottom: none;' }} padding: 2px 8px 4px 8px; vertical-align: top; line-height: 1.4; font-size: 9.5pt;">
                                @if($bd['label'])
                                    - {{ $bd['label'] }}
                                    @if($bd['qty'] > 1)
                                        <span style="color: #444; font-size: 8.5pt;">({{ $bd['qty'] }} x Rp {{ number_format($bd['rate'], 0, ',', '.') }})</span>
                                    @endif
                                @else
                                    {{ $bd['qty'] }} {{ str_contains(strtolower($row['title']), 'penginapan') ? 'malam' : 'hari' }} x Rp {{ number_format($bd['rate'], 0, ',', '.') }}
                                @endif
                            </td>
                            <td class="text-right" style="border-top: none; {{ $loop->last ? '' : 'border-bottom: none;' }} padding: 2px 8px 4px 8px; vertical-align: top; white-space: nowrap; line-height: 1.4; font-size: 9.5pt;">
                                Rp {{ number_format($bd['total'], 0, ',', '.') }}
                            </td>
                            <td style="border-top: none; {{ $loop->last ? '' : 'border-bottom: none;' }} padding: 2px 8px 4px 8px; vertical-align: top; text-align: left; font-size: 9pt; line-height: 1.4;">
                                {{ !empty($bd['keterangan']) ? $bd['keterangan'] : ($loop->first ? ($row['keterangan'] ?? '') : '') }}
                            </td>
                        </tr>
                    @endforeach
                @endif
            @endforeach

            <!-- Subtotal Row -->
            <tr class="text-bold">
                <td colspan="2" class="text-center" style="padding: 8px;">Jumlah</td>
                <td class="text-right" style="padding: 8px; white-space: nowrap;">Rp {{ number_format($itemData['total'], 0, ',', '.') }}</td>
                <td></td>
            </tr>
        </tbody>
    </table>

    <div class="terbilang-box">
        <span class="text-bold">Terbilang : </span>
        <span class="text-italic text-bold">{{ $itemData['terbilang'] }}</span>
    </div>

    <table class="signatures-table">
        <tr>
            <td style="padding-left: 10px; width: 50%;">
                telah dibayar sejumlah<br>
                Rp &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="text-bold">{{ number_format($itemData['total'], 0, ',', '.') }}</span><br>
                Bendahara Pengeluaran,<br>
                <div class="signature-container"></div>
                <span class="text-bold" style="text-decoration: underline;">{{ $bendaharaName }}</span><br>
                NIP. {{ $bendaharaNip }}
            </td>
            <td style="text-align: left; padding-left: 80px; width: 50%;">
                Palopo, {{ $printDate }}<br>
                Telah menerima jumlah uang sebesar<br>
                Rp &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="text-bold">{{ number_format($itemData['total'], 0, ',', '.') }}</span><br>
                Yang menerima,<br>
                <div class="signature-container"></div>
                <span class="text-bold" style="text-decoration: underline;">{{ $itemData['item']->employee_name }}</span><br>
                NIP. {{ $itemData['item']->employee_nip ?: '-' }}
            </td>
        </tr>
    </table>

    <hr style="border: none; border-top: 1.5px solid #000; margin: 15px 0;">

    <div class="rampung-section">
        <div class="rampung-title">Perhitungan SPD Rampung</div>
        
        <div style="width: 50%; float: left;">
            <table class="rampung-table">
                <tr>
                    <td style="width: 150px; padding: 3px 0;">Ditetapkan sejumlah</td>
                    <td style="width: 15px; padding: 3px 0;">:</td>
                    <td style="width: 25px; text-align: left; padding: 3px 0;">Rp</td>
                    <td class="text-bold" style="text-align: right; padding: 3px 20px 3px 0;">{{ number_format($itemData['total'], 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td style="padding: 3px 0;">Yang telah dibayar semula</td>
                    <td style="padding: 3px 0;">:</td>
                    <td style="text-align: left; padding: 3px 0;">Rp</td>
                    <td style="text-align: right; padding: 3px 20px 3px 0;">-</td>
                </tr>
                <tr style="border-top: 1px solid #000;">
                    <td class="text-bold" style="padding: 3px 0;">Sisa Kurang/Lebih</td>
                    <td class="text-bold" style="padding: 3px 0;">:</td>
                    <td class="text-bold" style="text-align: left; padding: 3px 0;">Rp</td>
                    <td class="text-bold" style="text-align: right; padding: 3px 20px 3px 0;">
                        {{ number_format($itemData['total'], 0, ',', '.') }}
                    </td>
                </tr>
            </table>
        </div>
        
        <div style="width: 45%; float: right; margin-top: 80px; padding-left: 30px; line-height: 1.3;">
            Pejabat Pembuat Komitmen,<br><br><br><br><br>
            <span class="text-bold" style="text-decoration: underline;">{{ $ppkName }}</span><br>
            NIP. {{ $ppkNip }}
        </div>
        
        <div style="clear: both;"></div>
    </div>

@endforeach

</body>
</html>
