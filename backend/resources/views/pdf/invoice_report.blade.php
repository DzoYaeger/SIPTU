<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <title>BUKTI PEMBELIAN - {{ $invoice->invoice_no }}</title>
    <style>
        @page {
            size: 612pt 936pt;
            /* Standard F4 / Folio Size (8.5 in x 13 in) */
            margin: 40pt 45pt 40pt 45pt;
            /* ~15mm clean white paper margins on all 4 sides */
        }

        * {
            box-sizing: border-box;
        }

        html,
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11pt;
            line-height: 1.35;
            color: #000;
            margin: 0;
            padding: 0;
        }

        .outer-border {
            border: 2px solid #000;
            padding: 20px 22px;
            margin: 20px 22px;
            min-height: 820pt;
            box-sizing: border-box;
        }

        /* Top Right Meta Table */
        .top-meta-table {
            width: 320px;
            margin-left: auto;
            margin-right: 0;
            border-collapse: collapse;
            margin-bottom: 10px;
        }

        .top-meta-table td {
            font-size: 11pt;
            font-weight: bold;
            padding: 2.5px 0;
            vertical-align: top;
        }

        .top-meta-label {
            width: 110px;
        }

        .top-meta-colon {
            width: 15px;
        }

        /* Title */
        .doc-title {
            text-align: center;
            font-size: 16pt;
            font-weight: 900;
            text-decoration: underline;
            margin-top: 10px;
            margin-bottom: 30px;
            letter-spacing: 0.5px;
        }

        /* Space for physical receipt attachment */
        .receipt-attachment-space {
            height: 570pt;
            width: 100%;
        }

        /* Bottom Details Table */
        .details-table {
            width: 100%;
            border-collapse: collapse;
            border-top: 1.5px solid #000;
        }

        .details-table td {
            padding: 3px 0;
            vertical-align: top;
            font-size: 11pt;
        }

        .col-label {
            width: 26%;
            font-weight: normal;
            font-size: 11pt;
        }

        .col-colon {
            width: 2.5%;
        }

        .col-value {
            width: 71.5%;
            font-weight: bold;
        }

        .sub-note {
            font-size: 9.5pt;
            font-weight: bold;
            margin-top: 1px;
        }

        .terbilang-row td {
            border-top: 1.5px solid #000;
            border-bottom: 1.5px solid #000;
            padding: 4px 0;
            font-weight: bold;
        }
    </style>
</head>

<body>
    <div class="outer-border">
        <!-- Top Right Metadata Table -->
        <table class="top-meta-table">
            <tr>
                <td class="top-meta-label">TA</td>
                <td class="top-meta-colon">:</td>
                <td>{{ $invoice->tahun_anggaran ?? date('Y') }}</td>
            </tr>
            <tr>
                <td class="top-meta-label">Nomor Bukti</td>
                <td class="top-meta-colon">:</td>
                <td>{{ $invoice->invoice_no }}</td>
            </tr>
            <tr>
                <td class="top-meta-label">Kode Akun</td>
                <td class="top-meta-colon">:</td>
                <td>{{ $invoice->mak ?? '' }}</td>
            </tr>
        </table>

        <!-- Document Main Title -->
        <div class="doc-title">
            BUKTI PEMBELIAN
        </div>

        <!-- Space for Original Receipt Attachment -->
        <div class="receipt-attachment-space"></div>

        <!-- Details Footer Table -->
        <table class="details-table">
            <!-- Uraian -->
            <tr>
                <td class="col-label">Uraian</td>
                <td class="col-colon">:</td>
                <td class="col-value">
                    {{ $invoice->deskripsi }}
                    <div class="sub-note">(sebagaimana nota terlampir)</div>
                </td>
            </tr>

            <!-- Jum.Nota/Kwitansi -->
            <tr>
                <td class="col-label">Jum.Nota/Kwitansi</td>
                <td class="col-colon">:</td>
                <td class="col-value">
                    Rp {{ number_format($invoice->nilai_kotor, 0, ',', '.') }}
                </td>
            </tr>

            <!-- Dynamic Multi-Tax Rows -->
            @if($invoice->taxes && count($invoice->taxes) > 0)
                @foreach($invoice->taxes as $tax)
                    <tr>
                        <td class="col-label">{{ $tax->jenis_pajak }}</td>
                        <td class="col-colon">:</td>
                        <td class="col-value">
                            Rp {{ number_format($tax->nilai_pajak, 0, ',', '.') }}
                        </td>
                    </tr>
                @endforeach
            @else
                <tr>
                    <td class="col-label">Pajak</td>
                    <td class="col-colon">:</td>
                    <td class="col-value">Rp 0</td>
                </tr>
            @endif

            <!-- Jumlah yg dibayarkan -->
            <tr>
                <td class="col-label" style="font-weight: normal;">Jumlah yg dibayarkan</td>
                <td class="col-colon">:</td>
                <td class="col-value" style="font-size: 11pt;">
                    Rp {{ number_format($invoice->nilai_bersih, 0, ',', '.') }}
                </td>
            </tr>

            <!-- Terbilang -->
            <tr class="terbilang-row">
                <td class="col-label" style="font-weight: normal;">Terbilang</td>
                <td class="col-colon">:</td>
                <td class="col-value" style="font-weight: bold;">
                    {{ \App\Http\Controllers\Api\InvoiceController::terbilang($invoice->nilai_bersih) }}
                </td>
            </tr>
        </table>
    </div>
</body>

</html>