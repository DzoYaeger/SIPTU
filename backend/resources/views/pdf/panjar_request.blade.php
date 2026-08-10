<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Form Persetujuan Permintaan Panjar - {{ $panjar->panjar_no ?? $panjar->ticket_no }}</title>
    <style>
        @page { size: A4 portrait; margin: 20pt 30pt 20pt 30pt; }
        * { box-sizing: border-box; }
        body { font-family: "Times New Roman", Times, serif; font-size: 10pt; line-height: 1.25; color: #000; margin: 0; padding: 0; }
        .header-meta-table { float: right; width: 260pt; border-collapse: collapse; margin-bottom: 10pt; }
        .header-meta-table td { font-size: 9.5pt; padding: 1.5pt 0; vertical-align: top; }
        .meta-label { width: 70pt; }
        .meta-colon { width: 10pt; }
        .clear { clear: both; }
        .doc-title { text-align: center; font-size: 11pt; font-weight: bold; margin-top: 15pt; margin-bottom: 15pt; }
        .section-header { font-weight: bold; margin-top: 6pt; margin-bottom: 3pt; }
        .form-table { width: 100%; border-collapse: collapse; margin-left: 10pt; margin-bottom: 4pt; }
        .form-table td { padding: 1.5pt 0; vertical-align: top; font-size: 9.5pt; }
        .lbl-col { width: 140pt; }
        .cln-col { width: 12pt; }
        .val-col { width: auto; }
        .bold-italic { font-weight: bold; font-style: italic; }
        .rincian-list { margin: 0; padding-left: 15pt; list-style-type: none; }
        .rincian-list li { padding: 1pt 0; }
        .statement-text { font-size: 9.5pt; margin-top: 10pt; margin-bottom: 10pt; }
        .ttd-table { width: 100%; border-collapse: collapse; margin-top: 5pt; margin-bottom: 15pt; }
        .ttd-table td { vertical-align: top; text-align: center; font-size: 9.5pt; }
        .ttd-space { height: 45pt; }
        .tanda-terima-box { margin-top: 15pt; border-top: 1px dashed #000; padding-top: 10pt; }
        .tanda-terima-title { text-align: center; font-weight: bold; font-size: 11pt; margin-bottom: 8pt; }
    </style>
</head>
<body>
    <table class="header-meta-table">
        <tr><td class="meta-label">Daftar</td><td class="meta-colon">:</td><td>Permintaan Uang Muka</td></tr>
        <tr><td class="meta-label">No.</td><td class="meta-colon">:</td><td>{{ $panjar->panjar_no ?? $panjar->ticket_no }}</td></tr>
        <tr><td class="meta-label">Permintaan</td><td class="meta-colon">:</td><td>DIPA T.A {{ $panjar->tahun_anggaran ?? date('Y') }}</td></tr>
        <tr><td class="meta-label">Keperluan</td><td class="meta-colon">:</td><td>{{ $panjar->kegiatan }}</td></tr>
    </table>
    <div class="clear"></div>

    <div class="doc-title">Form Persetujuan Permintaan Panjar</div>

    <div class="section-header">I &nbsp;&nbsp; Yang Mengajukan Permintaan :</div>
    <table class="form-table">
        <tr><td class="lbl-col">Nama</td><td class="cln-col">:</td><td class="val-col">{{ $pegawai['nama'] ?? $panjar->penerima_name ?? '-' }}</td></tr>
        <tr><td class="lbl-col">NIP</td><td class="cln-col">:</td><td class="val-col">{{ $pegawai['nip'] ?? '-' }}</td></tr>
        <tr><td class="lbl-col">Pangkat / Gol</td><td class="cln-col">:</td><td class="val-col">{{ $pegawai['pangkat'] ?? '-' }}</td></tr>
        <tr><td class="lbl-col">Jabatan</td><td class="cln-col">:</td><td class="val-col">{{ $pegawai['jabatan'] ?? '-' }}</td></tr>
    </table>

    <div class="section-header">II &nbsp;&nbsp; Uang Muka yang Dibutuhkan</div>
    <table class="form-table">
        <tr><td class="lbl-col">Sejumlah</td><td class="cln-col">:</td><td class="val-col">Rp. {{ number_format($panjar->nominal_panjar ?? 0, 0, ',', '.') }}</td></tr>
        <tr><td class="lbl-col">Dengan Huruf</td><td class="cln-col">:</td><td class="val-col bold-italic">{{ $panjar->terbilang_panjar ?? '-' }}</td></tr>
        <tr><td class="lbl-col">Target Pekerjaan</td><td class="cln-col">:</td><td class="val-col">{{ $panjar->kegiatan }}</td></tr>
        <tr>
            <td class="lbl-col">Rincian Biaya</td>
            <td class="cln-col">:</td>
            <td class="val-col">
                @if(isset($panjar->items) && count($panjar->items) > 0)
                    <ul class="rincian-list">
                        @foreach($panjar->items as $item)
                            <li>- {{ $item->uraian }} : Rp. {{ number_format($item->jumlah ?? $item->harga_satuan ?? 0, 0, ',', '.') }}</li>
                        @endforeach
                    </ul>
                @else
                    - {{ $panjar->uraian ?? $panjar->kegiatan }} : Rp. {{ number_format($panjar->nominal_panjar ?? 0, 0, ',', '.') }}
                @endif
            </td>
        </tr>
        <tr><td class="lbl-col">No. Surat Tugas</td><td class="cln-col">:</td><td class="val-col">{{ $panjar->surat_tugas_no ?? '-' }}</td></tr>
        <tr><td class="lbl-col">Akan dilakukan pada</td><td class="cln-col">:</td><td class="val-col">{{ $tgl_mulai }}</td></tr>
        <tr><td class="lbl-col">Dan akan berakhir pada</td><td class="cln-col">:</td><td class="val-col">{{ $tgl_akhir }}</td></tr>
    </table>

    <div class="statement-text">
        Pernyataan dokumen dan perhitungan rampung akan diselesaikan selambat-lambatnya pada tanggal {{ $tgl_paling_lambat }}
    </div>

    <table class="ttd-table">
        <tr><td style="width: 55%;"></td><td style="width: 45%;">Palopo, {{ $tgl_cetak }}</td></tr>
        <tr>
            <td>Mengetahui, Menyetujui<br>Pejabat Pembuat Komitmen<div class="ttd-space"></div><strong>{{ $panjar->ppk_name ?? '-' }}</strong><br>NIP. {{ $panjar->ppk_nip ?? '-' }}</td>
            <td>Yang Mengajukan permintaan<div class="ttd-space"></div><strong>{{ $pegawai['nama'] ?? $panjar->penerima_name ?? '-' }}</strong><br>NIP. {{ $pegawai['nip'] ?? '-' }}</td>
        </tr>
    </table>

    <div class="tanda-terima-box">
        <div class="tanda-terima-title">TANDA TERIMA</div>
        <table class="form-table">
            <tr><td class="lbl-col">Nama Penerima</td><td class="cln-col">:</td><td class="val-col"><strong>{{ $pegawai['nama'] ?? $panjar->penerima_name ?? '-' }}</strong></td></tr>
            <tr><td class="lbl-col">Terima dari</td><td class="cln-col">:</td><td class="val-col">Bendahara Pengeluaran</td></tr>
            <tr><td class="lbl-col">Sejumlah</td><td class="cln-col">:</td><td class="val-col">Rp. {{ number_format($panjar->nominal_panjar ?? 0, 0, ',', '.') }}</td></tr>
            <tr><td class="lbl-col">Dengan Huruf</td><td class="cln-col">:</td><td class="val-col bold-italic">{{ $panjar->terbilang_panjar ?? '-' }}</td></tr>
        </table>
        <table class="ttd-table" style="margin-top: 10pt;">
            <tr>
                <td style="width: 33%;">Menyetujui,<br>Pejabat Pembuat Komitmen,<div class="ttd-space"></div><strong>{{ $panjar->ppk_name ?? '-' }}</strong><br>NIP. {{ $panjar->ppk_nip ?? '-' }}</td>
                <td style="width: 34%;">Dibayarkan Oleh<br>Bendahara Pengeluaran<div class="ttd-space"></div><strong>{{ $panjar->bendahara_name ?? '-' }}</strong><br>NIP. {{ $panjar->bendahara_nip ?? '-' }}</td>
                <td style="width: 33%;">Palopo, {{ $tgl_cetak }}<br>Yang Mengajukan permintaan<div class="ttd-space"></div><strong>{{ $pegawai['nama'] ?? $panjar->penerima_name ?? '-' }}</strong><br>NIP. {{ $pegawai['nip'] ?? '-' }}</td>
            </tr>
        </table>
    </div>
</body>
</html>