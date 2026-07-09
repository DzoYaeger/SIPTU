<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Daftar Pengeluaran Rill</title>
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
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>

@foreach($processedItems as $index => $itemData)
    @if($index > 0)
        <div class="page-break"></div>
    @endif

    <div style="text-align: center; font-size: 13pt; font-weight: bold; margin-top: 10px; margin-bottom: 25px; text-decoration: underline; letter-spacing: 0.5px;">
        DAFTAR PENGELUARAN RILL
    </div>

    <p style="margin-bottom: 12px; font-size: 10pt;">Yang bertanda tangan di bawah ini :</p>
    
    <table style="width: 100%; margin-bottom: 18px; font-size: 10pt; line-height: 1.5; border-collapse: collapse;">
        <tr>
            <td style="width: 100px; padding: 2px 0; vertical-align: top;">Nama</td>
            <td style="width: 15px; padding: 2px 0; text-align: center; vertical-align: top;">:</td>
            <td style="padding: 2px 0; vertical-align: top;">{{ $itemData['item']->employee_name }}</td>
        </tr>
        <tr>
            <td style="padding: 2px 0; vertical-align: top;">N I P</td>
            <td style="padding: 2px 0; text-align: center; vertical-align: top;">:</td>
            <td style="padding: 2px 0; vertical-align: top;">{{ $itemData['item']->employee_nip ?: '-' }}</td>
        </tr>
        <tr>
            <td style="padding: 2px 0; vertical-align: top;">Jabatan</td>
            <td style="padding: 2px 0; text-align: center; vertical-align: top;">:</td>
            <td style="padding: 2px 0; vertical-align: top;">{{ $itemData['position'] }}</td>
        </tr>
    </table>
    
    <p style="text-align: justify; font-size: 10pt; line-height: 1.5; margin-bottom: 18px;">
        Berdasarkan Surat Perintah Perjalanan Dinas (SPPD) Nomor &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span class="text-bold">{{ $itemData['item']->nomor_spd ?: '-' }}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Tanggal &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span class="text-bold">{{ $sppdDate }}</span><br>
        dengan ini kami menyatakan dengan sesungguhnya bahwa :
    </p>
    
    <p style="text-align: justify; font-size: 10pt; line-height: 1.5; margin-bottom: 12px;">
        1. Biaya transport pegawai dan/atau biaya penginapan di bawah ini yang tidak dapat diperoleh bukti-bukti pengeluarannya, meliputi :
    </p>
    
    <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5pt; margin-bottom: 18px;">
        <thead>
            <tr>
                <th style="border: 1px solid #000; border-bottom: 1.5px solid #000; padding: 8px 6px; font-weight: bold; text-align: center; width: 45px; background-color: #fafafa;">No</th>
                <th style="border: 1px solid #000; border-bottom: 1.5px solid #000; padding: 8px 6px; font-weight: bold; text-align: center; background-color: #fafafa;">Uraian</th>
                <th style="border: 1px solid #000; border-bottom: 1.5px solid #000; padding: 8px 6px; font-weight: bold; text-align: center; width: 200px; background-color: #fafafa;">Jumlah</th>
            </tr>
        </thead>
        <tbody>
            @foreach($itemData['rows'] as $row)
                <tr>
                    <td style="border: 1px solid #000; padding: 8px 6px; text-align: center; vertical-align: middle;">{{ $row['no'] }}.</td>
                    <td style="border: 1px solid #000; padding: 8px 6px; vertical-align: middle;">
                        <span style="float: left;">{{ $row['title'] }}</span>
                        <span style="float: right; margin-right: 10px; color: #333;">{{ $row['desc'] }}</span>
                        <div style="clear: both;"></div>
                    </td>
                    <td style="border: 1px solid #000; padding: 8px 6px; vertical-align: middle;">
                        <span style="float: left;">Rp</span>
                        <span style="float: right; font-weight: bold; margin-right: 20px;">
                            @if($row['value'] > 0)
                                {{ number_format($row['value'], 0, ',', '.') }}
                            @else
                                -
                            @endif
                        </span>
                        <div style="clear: both;"></div>
                    </td>
                </tr>
            @endforeach
            <tr style="font-weight: bold; border-top: 1.5px solid #000;">
                <td colspan="2" style="border: 1px solid #000; padding: 8px 6px; text-align: center; background-color: #fafafa; vertical-align: middle;">Jumlah</td>
                <td style="border: 1px solid #000; padding: 8px 6px; background-color: #fafafa; vertical-align: middle;">
                    <span style="float: left;">Rp</span>
                    <span style="float: right; font-weight: bold; margin-right: 20px;">
                        @if($itemData['total'] > 0)
                            {{ number_format($itemData['total'], 0, ',', '.') }}
                        @else
                            -
                        @endif
                    </span>
                    <div style="clear: both;"></div>
                </td>
            </tr>
        </tbody>
    </table>
    
    <table style="width: 100%; border-collapse: collapse; font-size: 10pt; line-height: 1.5; margin-bottom: 20px;">
        <tr>
            <td style="width: 25px; vertical-align: top; text-align: left; padding: 0;">2.</td>
            <td style="vertical-align: top; text-align: justify; padding: 0;">
                Jumlah uang tersebut pada angka 1 di atas benar - benar dikeluarkan untuk pelaksanaan perjalanan dinas dimaksud dan apabila dikemudian hari terdapat kelebihan atas pembayaran, kami bersedia untuk menyetorkan kelebihan tersebut ke Kas Negara.
            </td>
        </tr>
    </table>
    
    <p style="text-align: justify; font-size: 10pt; line-height: 1.5; margin-bottom: 30px;">
        Demikian pernyataan ini kami buat dengan sebenarnya, untuk di pergunakan sebagaimana mestinya
    </p>
    
    <table style="width: 100%; border-collapse: collapse; font-size: 10pt; line-height: 1.4;">
        <tr>
            <td style="width: 50%; vertical-align: top; text-align: left;">
                Mengetahui / Menyetujui<br>
                Pejabat Pembuat Komitmen,<br>
                <br><br><br><br><br>
                <span class="text-bold" style="text-decoration: underline;">{{ $ppkName }}</span><br>
                NIP. {{ $ppkNip }}
            </td>
            <td style="width: 50%; vertical-align: top; text-align: left; padding-left: 70px;">
                Palopo, {{ $printDate }}<br>
                Pegawai Negeri<br>
                Yang melakukan perjalanan dinas,<br>
                <br><br><br><br><br>
                <span class="text-bold" style="text-decoration: underline;">{{ $itemData['item']->employee_name }}</span><br>
                NIP. {{ $itemData['item']->employee_nip ?: '-' }}
            </td>
        </tr>
    </table>

@endforeach

</body>
</html>
