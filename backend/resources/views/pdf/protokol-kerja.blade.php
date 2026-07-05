<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Protokol Kerja - {{ $nomor_st ?? '' }}</title>
    <style>
        @page { size: 215.9mm 330mm; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: serif; 
            font-size: 11pt; 
            color: #000; 
            margin: 40px 50px; /* 40px atas/bawah, 50px kiri/kanan - mengatur jarak tepi kertas */
        }

        h1.title {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 20px;
            text-decoration: underline;
        }

        table.main {
            width: 100%;
            border-collapse: collapse;
        }
        table.main td, table.main th {
            border: 1px solid #000;
            padding: 5px 8px;
            vertical-align: top;
            font-size: 10pt;
        }
        table.main th {
            background: #e8edf5;
            font-weight: bold;
            text-align: center;
            padding: 6px 8px;
        }

        .label-cell { font-weight: bold; width: 140px; }
        .no-cell { text-align: center; width: 20px; }
        .hint { font-style: italic; font-size: 7.5pt; color: #888; text-align: center; vertical-align: middle; width: 60px; }

        .emp-detail { font-size: 9pt; color: #333; padding-left: 8px; }

        .note { font-style: italic; font-size: 9pt; margin-top: 10px; margin-bottom: 14px; }

        table.signature { width: 100%; margin-top: 6px; border: none; }
        table.signature td { border: none; vertical-align: top; width: 50%; padding: 4px; font-size: 10pt; }
        .sig-title { font-weight: bold; font-style: italic; }
        .sig-name { font-weight: bold; text-decoration: underline; }
        .sig-nip { font-size: 9pt; }

        /* QR Code Logo Overlay */
        .qr-wrapper { 
            position: relative; 
            width: 100px; 
            height: 100px; 
            margin-bottom: 5px; 
            display: block;
            line-height: 0;
            font-size: 0;
        }
        .qr-wrapper.right { margin-left: auto; margin-right: 0; }
        .qr-code { width: 100px; height: 100px; display: block; margin: 0; vertical-align: top; }
        .qr-logo { 
            position: absolute; 
            top: 50%; 
            left: 50%; 
            width: 20px; 
            height: 20px; 
            margin-top: -10px; 
            margin-left: -10px; 
            background: white; 
            padding: 1px;
            border-radius: 2px;
        }
    </style>
</head>
<body>
    <h1 class="title">PROTOKOL KERJA</h1>

    <table class="main">
        <tr>
            <td class="label-cell">Rencana Kerja</td>
            <td colspan="2">{{ $deskripsi_tugas ?? '-' }}</td>
            <td class="hint"></td>
        </tr>
        <tr>
            <td class="label-cell">Tempat Pelaksanaan</td>
            <td colspan="2">{{ $lokasi_tugas ?? '-' }}</td>
            <td class="hint"></td>
        </tr>
        <tr>
            <td class="label-cell">Waktu Pelaksanaan</td>
            <td colspan="2">{{ $tanggal_mulai ?? '' }} - {{ $tanggal_selesai ?? '' }}</td>
            <td class="hint"></td>
        </tr>

        <tr>
            <th class="label-cell">Uraian</th>
            <th class="no-cell">No.</th>
            <th>Sarana/Label/Media</th>
            <th class="hint" style="color:#000; font-weight:bold; font-style:normal; font-size:10pt;">Justifikasi</th>
        </tr>

        @if(!empty($sarana))
            @foreach($sarana as $i => $sar)
            <tr>
                @if($i === 0)
                    <td class="label-cell" rowspan="{{ count($sarana) }}">Sasaran</td>
                @endif
                <td class="no-cell">{{ $i + 1 }}</td>
                <td>
                    <div><strong>{{ $sar['nama'] ?? '' }}</strong></div>
                    @if(!empty($sar['lokasi']))
                        <div class="emp-detail">{{ $sar['lokasi'] }}</div>
                    @endif
                </td>
                @if($i === 0)
                    <td class="hint" rowspan="{{ count($sarana) }}"></td>
                @endif
            </tr>
            @endforeach
        @else
            <tr>
                <td class="label-cell">Sasaran</td>
                <td class="no-cell">-</td>
                <td>-</td>
                <td class="hint"></td>
            </tr>
        @endif

        @if(!empty($employees))
            @foreach($employees as $i => $emp)
            <tr>
                @if($i === 0)
                    <td class="label-cell" rowspan="{{ count($employees) }}">Petugas</td>
                @endif
                <td class="no-cell">{{ $i + 1 }}</td>
                <td>
                    <div><strong>{{ $emp['name'] ?? '' }}</strong></div>
                    @if(!empty($emp['nip']))
                        <div class="emp-detail">NIP. {{ $emp['nip'] }}</div>
                    @endif
                    @if(!empty($emp['pangkat']))
                        <div class="emp-detail">Pangkat: {{ $emp['pangkat'] }}</div>
                    @endif
                    @if(!empty($emp['position']))
                        <div class="emp-detail">Jabatan: {{ $emp['position'] }}</div>
                    @endif
                </td>
                @if($i === 0)
                    <td class="hint" rowspan="{{ count($employees) }}"></td>
                @endif
            </tr>
            @endforeach
        @else
            <tr>
                <td class="label-cell">Petugas</td>
                <td class="no-cell">-</td>
                <td>-</td>
                <td class="hint"></td>
            </tr>
        @endif

        <tr>
            <td class="label-cell">Anggaran</td>
            <td class="no-cell"></td>
            <td>{{ $mak ?? '-' }}</td>
            <td class="hint"></td>
        </tr>
    </table>

    <table class="signature">
        <tr>
            <td>
                <span class="sig-title">Disetujui</span><br>
                <span class="sig-title">{{ $status_jabatan ?? '' }}Kepala Balai POM di Palopo</span>
            </td>
            <td style="text-align: right;">
                Palopo, {{ $tanggal_penginputan ?? '' }}<br>
                <strong>Ketua Tim</strong>
            </td>
        </tr>
        <tr>
            <td style="padding-top: {{ isset($qr_image_kepala) ? '10px' : '60px' }}; vertical-align: bottom;">
                @if(isset($qr_image_kepala))
                    <div class="qr-wrapper">
                        <img src="{{ $qr_image_kepala }}" alt="QR Code Kepala" class="qr-code">
                        @if(isset($logo_base64) && $logo_base64)
                            <img src="{{ $logo_base64 }}" class="qr-logo">
                        @endif
                    </div>
                    <span style="font-size: 8px; color: #555;">Ditandatangani secara elektronik</span><br>
                    @if(isset($signed_kepala_at))
                        <span style="font-size: 7px; color: #777;">{{ $signed_kepala_at }}</span><br>
                    @endif
                @endif
                <span class="sig-name">{{ $penandatangan_name ?? '-' }}</span><br>
                @if(!empty($penandatangan_nip))
                    <span class="sig-nip">NIP. {{ $penandatangan_nip }}</span>
                @endif
            </td>
            <td style="text-align: right; padding-top: {{ isset($qr_image) ? '10px' : '60px' }}; vertical-align: bottom;">
                @php
                    $ketuaData = $ketua_tim ?? ($employees[0] ?? null);
                @endphp
                @if(isset($qr_image))
                    <div class="qr-wrapper right">
                        <img src="{{ $qr_image }}" alt="QR Code Katim" class="qr-code">
                        @if(isset($logo_base64) && $logo_base64)
                            <img src="{{ $logo_base64 }}" class="qr-logo">
                        @endif
                    </div>
                    <span style="font-size: 8px; color: #555;">Ditandatangani secara elektronik</span><br>
                    @if(isset($signed_at))
                        <span style="font-size: 7px; color: #777;">{{ $signed_at }}</span><br>
                    @endif
                @endif
                @if($ketuaData)
                    <span class="sig-name">{{ $ketuaData['name'] ?? '' }}</span><br>
                    @if(!empty($ketuaData['nip']))
                        <span class="sig-nip">NIP. {{ $ketuaData['nip'] }}</span>
                    @endif
                @else
                    <br><br>____________________
                @endif
            </td>
        </tr>
    </table>
</body>
</html>
