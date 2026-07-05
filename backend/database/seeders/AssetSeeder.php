<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Asset;
use Illuminate\Support\Facades\DB;

class AssetSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $userId = \App\Models\User::first()->id ?? 1;

        // Create sample assets
        Asset::create([
            'name' => 'Laptop Dell XPS 13',
            'category' => 'Elektronik',
            'quantity' => 10,
            'location' => 'Gedung A, Lantai 2',
            'status' => 'tersedia',
            'asset_code' => 'LT-DLL-XPS13-001',
            'brand' => 'Dell',
            'model' => 'XPS 13',
            'year_of_purchase' => 2023,
            'purchase_price' => 15000000.00,
            'description' => 'High-performance laptop for office work',
            'condition' => 'baru',
            'created_by' => $userId, 
        ]);

        Asset::create([
            'name' => 'Meja Kerja Ergonomis',
            'category' => 'Furniture',
            'quantity' => 15,
            'location' => 'Gedung B, Lantai 1',
            'status' => 'tersedia',
            'asset_code' => 'MJ-ERG-001',
            'brand' => 'ErgoOffice',
            'model' => 'Ergonomic Executive',
            'year_of_purchase' => 2022,
            'purchase_price' => 2500000.00,
            'description' => 'Ergonomic office desk',
            'condition' => 'baru',
            'created_by' => $userId, 
        ]);

        Asset::create([
            'name' => 'Proyektor Epson EB-U05',
            'category' => 'Elektronik',
            'quantity' => 5,
            'location' => 'Ruang Rapat Utama',
            'status' => 'dipinjam',
            'asset_code' => 'PR-EPS-U05-001',
            'brand' => 'Epson',
            'model' => 'EB-U05',
            'year_of_purchase' => 2023,
            'purchase_price' => 8000000.00,
            'description' => 'Ultra-short throw laser projector',
            'condition' => 'bekas',
            'created_by' => $userId, 
        ]);
    }
}
