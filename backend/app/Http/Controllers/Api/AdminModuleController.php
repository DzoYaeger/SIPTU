<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AdminModuleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Define the modules structure for the application
        $modules = [
            [
                'slug' => 'dashboard',
                'name' => 'Dashboard',
                'roles' => ['admin', 'operator', 'validator'],
                'parent' => null,
            ],
            [
                'slug' => 'kepegawaian',
                'name' => 'Kepegawaian',
                'roles' => ['admin'],
                'parent' => null,
                'children' => [
                    [
                        'slug' => 'kepegawaian-data-pegawai',
                        'name' => 'Data Pegawai',
                        'roles' => ['admin'],
                        'parent' => 'kepegawaian',
                    ],
                    [
                        'slug' => 'kepegawaian-kgb',
                        'name' => 'Kenaikan Gaji Berkala',
                        'roles' => ['admin'],
                        'parent' => 'kepegawaian',
                    ],
                    [
                        'slug' => 'kepegawaian-kalender',
                        'name' => 'Kalender Kerja',
                        'roles' => ['admin', 'operator'],
                        'parent' => 'kepegawaian',
                    ],
                    [
                        'slug' => 'kepegawaian-surat-tugas',
                        'name' => 'Surat Tugas',
                        'roles' => ['admin', 'operator', 'validator'],
                        'parent' => 'kepegawaian',
                    ],
                ],
            ],
            [
                'slug' => 'rispeg',
                'name' => 'RISPEG',
                'roles' => ['admin', 'operator', 'validator'],
                'parent' => null,
                'children' => [
                    [
                        'slug' => 'rispeg-ruh',
                        'name' => 'RUH Pegawai',
                        'roles' => ['admin', 'operator'],
                        'parent' => 'rispeg',
                    ],
                    [
                        'slug' => 'rispeg-dashboard',
                        'name' => 'Dashboard RISPEG',
                        'roles' => ['admin', 'validator'],
                        'parent' => 'rispeg',
                    ],
                    [
                        'slug' => 'rispeg-izin-keluar',
                        'name' => 'Izin Keluar Kantor',
                        'roles' => ['admin', 'operator', 'validator'],
                        'parent' => 'rispeg',
                    ],
                ],
            ],
            [
                'slug' => 'kearsipan',
                'name' => 'Kearsipan',
                'roles' => ['admin'],
                'parent' => null,
                'children' => [
                    [
                        'slug' => 'kearsipan-peminjaman',
                        'name' => 'Peminjaman Arsip',
                        'roles' => ['admin'],
                        'parent' => 'kearsipan',
                    ],
                    [
                        'slug' => 'kearsipan-manajemen-up-uk',
                        'name' => 'Manajemen UK/UP',
                        'roles' => ['admin'],
                        'parent' => 'kearsipan',
                    ],
                    [
                        'slug' => 'kearsipan-laporan',
                        'name' => 'Laporan Peminjaman',
                        'roles' => ['admin'],
                        'parent' => 'kearsipan',
                    ],
                    [
                        'slug' => 'kearsipan-pencatatan-surat',
                        'name' => 'Pencatatan Surat',
                        'roles' => ['admin', 'operator'],
                        'parent' => 'kearsipan',
                    ],
                ],
            ],
            [
                'slug' => 'bmn',
                'name' => 'Barang Milik Negara',
                'roles' => ['admin'],
                'parent' => null,
                'children' => [
                    [
                        'slug' => 'bmn-data-aset-tetap',
                        'name' => 'Data Aset Tetap',
                        'roles' => ['admin'],
                        'parent' => 'bmn',
                    ],
                    [
                        'slug' => 'bmn-data-persediaan',
                        'name' => 'Data Persediaan',
                        'roles' => ['admin'],
                        'parent' => 'bmn',
                    ],
                    [
                        'slug' => 'bmn-permintaan-persediaan',
                        'name' => 'Permintaan Persediaan',
                        'roles' => ['admin'],
                        'parent' => 'bmn',
                    ],
                    [
                        'slug' => 'bmn-peminjaman-aset',
                        'name' => 'Peminjaman Aset',
                        'roles' => ['admin'],
                        'parent' => 'bmn',
                    ],
                    [
                        'slug' => 'bmn-pemeliharaan-keluhan',
                        'name' => 'Pemeliharaan/Keluhan',
                        'roles' => ['admin', 'validator'],
                        'parent' => 'bmn',
                    ],
                    [
                        'slug' => 'bmn-laporan',
                        'name' => 'Laporan BMN',
                        'roles' => ['admin'],
                        'parent' => 'bmn',
                    ],
                ],
            ],
            [
                'slug' => 'it-helpdesk',
                'name' => 'IT Helpdesk',
                'roles' => ['admin'],
                'parent' => null,
                'children' => [
                    [
                        'slug' => 'it-helpdesk-pelaporan',
                        'name' => 'Pelaporan Keluhan',
                        'roles' => ['admin'],
                        'parent' => 'it-helpdesk',
                    ],
                    [
                        'slug' => 'it-helpdesk-rekapan',
                        'name' => 'Rekapan Laporan',
                        'roles' => ['admin'],
                        'parent' => 'it-helpdesk',
                    ],
                ],
            ],
            [
                'slug' => 'pengadaan-pdtt',
                'name' => 'Pengadaan PDTT',
                'roles' => ['admin', 'validator'],
                'parent' => null,
            ],
            [
                'slug' => 'layanan-mandiri',
                'name' => 'Layanan Mandiri',
                'roles' => ['admin', 'operator', 'validator'],
                'parent' => null,
            ],
            [
                'slug' => 'riwayat-layanan',
                'name' => 'Riwayat Layanan',
                'roles' => ['admin', 'operator', 'validator'],
                'parent' => null,
            ],
            [
                'slug' => 'operator-dashboard',
                'name' => 'Operator Dashboard',
                'roles' => ['admin', 'operator'],
                'parent' => null,
            ],
            [
                'slug' => 'siamparan',
                'name' => 'Manajemen SIAMPARAN',
                'roles' => ['admin', 'operator', 'validator'],
                'parent' => null,
            ],
            [
                'slug' => 'antrian-kontrol',
                'name' => 'Manajemen UPP',
                'roles' => ['admin', 'operator', 'validator'],
                'parent' => null,
            ],
            [
                'slug' => 'admin-user-management',
                'name' => 'Manajemen Pengguna',
                'roles' => ['admin'],
                'parent' => null,
            ],
            [
                'slug' => 'admin-notification-settings',
                'name' => 'Pengaturan Notifikasi',
                'roles' => ['admin'],
                'parent' => null,
            ],
        ];

        return response()->json([
            'data' => $modules,
            'meta' => [
                'total' => count($modules),
            ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
