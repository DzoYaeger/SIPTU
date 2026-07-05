<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request as HttpRequest;
use App\Models\SuratTugas;
use App\Models\ExitPermit;
use App\Models\Request as BmnRequest;
use App\Models\Loan as BmnLoan;
use App\Models\BmnMaintenanceReport;
use App\Models\ProcurementProposal;
use App\Models\ArchiveLoan;
use App\Models\ItHelpdeskTicket;

class ValidatorDashboardController extends Controller
{
    /**
     * Get aggregated validator dashboard data based on user module permissions.
     */
    public function getDashboardData(HttpRequest $request)
    {
        $user = $request->user();
        $permissions = $user->module_permissions ?? [];
        
        $dashboardData = [];

        // Check each permission and get relevant counts if is_validator is true
        foreach ($permissions as $perm) {
            if (empty($perm['is_validator'])) {
                continue;
            }

            $moduleSlug = $perm['module_slug'];

            switch ($moduleSlug) {
                case 'kepegawaian-surat-tugas':
                    $dashboardData['surat_tugas'] = [
                        'title' => 'Surat Tugas',
                        'description' => 'Menunggu persetujuan penerbitan',
                        'pending' => SuratTugas::where('status', 'pending')->count(),
                        'slug' => 'kepegawaian-surat-tugas',
                        'color' => 'blue',
                    ];
                    break;

                case 'rispeg-izin-keluar':
                    $dashboardData['izin_keluar'] = [
                        'title' => 'Izin Keluar Kantor',
                        'description' => 'Permintaan izin keluar pegawai',
                        'pending' => ExitPermit::where('status', 'pending')->count(),
                        'slug' => 'rispeg-izin-keluar',
                        'color' => 'cyan',
                    ];
                    break;

                case 'bmn-permintaan-persediaan':
                    $dashboardData['permintaan_persediaan'] = [
                        'title' => 'Permintaan Persediaan BMN',
                        'description' => 'Usulan barang persediaan baru',
                        'pending' => BmnRequest::where('status', 'pending')->count(),
                        'slug' => 'bmn-permintaan-persediaan',
                        'color' => 'orange',
                    ];
                    break;
                    
                case 'bmn-peminjaman-aset':
                    $dashboardData['peminjaman_aset'] = [
                        'title' => 'Peminjaman Aset BMN',
                        'description' => 'Pengajuan peminjaman barang inventaris',
                        'pending' => BmnLoan::where('status', 'pending')->count(),
                        'slug' => 'bmn-peminjaman-aset',
                        'color' => 'purple',
                    ];
                    break;

                case 'bmn-pemeliharaan-keluhan':
                    $dashboardData['pemeliharaan_aset'] = [
                        'title' => 'Keluhan Pemeliharaan BMN',
                        'description' => 'Laporan kerusakan aset untuk divalidasi',
                        'pending' => BmnMaintenanceReport::where('status', 'pending')->count(),
                        'slug' => 'bmn-pemeliharaan-keluhan',
                        'color' => 'volcano',
                    ];
                    break;

                case 'pengadaan-pdtt':
                    $dashboardData['pengadaan_pdtt'] = [
                        'title' => 'Usulan Pengadaan PDTT',
                        'description' => 'Usulan PDTT yang diajukan unit',
                        'pending' => ProcurementProposal::whereIn('status', ['submitted', 'pending'])->count(),
                        'slug' => 'pengadaan-pdtt',
                        'color' => 'green',
                    ];
                    break;

                case 'kearsipan-peminjaman':
                    $dashboardData['kearsipan_peminjaman'] = [
                        'title' => 'Peminjaman Arsip',
                        'description' => 'Permintaan peminjaman dokumen arsip',
                        'pending' => ArchiveLoan::where('status', 'pending')->count(),
                        'slug' => 'kearsipan-peminjaman',
                        'color' => 'gold',
                    ];
                    break;

                case 'it-helpdesk':
                    $dashboardData['it_helpdesk'] = [
                        'title' => 'IT Helpdesk',
                        'description' => 'Laporan gangguan IT menunggu respon',
                        'pending' => ItHelpdeskTicket::where('status', 'pending')->count(),
                        'slug' => 'it-helpdesk',
                        'color' => 'magenta',
                    ];
                    break;
            }
        }

        return response()->json([
            'success' => true,
            'data' => array_values($dashboardData) // Return as a clean array
        ]);
    }
}
