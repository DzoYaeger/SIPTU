<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Inventory;

class InventorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create sample inventory items
        Inventory::create([
            'name' => 'Kertas HVS A4',
            'category' => 'ATK',
            'quantity' => 1000,
            'unit' => 'rim',
            'location' => 'Gudang ATK',
            'price_per_unit' => 50000.00,
            'last_updated' => now(),
            'description' => 'Kertas HVS ukuran A4 untuk printer dan mesin fotocopy',
            'status' => 'tersedia',
            'updated_by' => 1, // Assuming user with ID 1 exists
        ]);

        Inventory::create([
            'name' => 'Pensil 2B',
            'category' => 'ATK',
            'quantity' => 200,
            'unit' => 'buah',
            'location' => 'Gudang ATK',
            'price_per_unit' => 2000.00,
            'last_updated' => now(),
            'description' => 'Pensil 2B untuk tulis-menulis',
            'status' => 'tersedia',
            'updated_by' => 1, // Assuming user with ID 1 exists
        ]);

        Inventory::create([
            'name' => 'Toner Printer HP',
            'category' => 'Elektronik',
            'quantity' => 20,
            'unit' => 'unit',
            'location' => 'Gudang Elektronik',
            'price_per_unit' => 450000.00,
            'last_updated' => now(),
            'description' => 'Toner kompatibel untuk printer HP LaserJet',
            'status' => 'tersedia',
            'updated_by' => 1, // Assuming user with ID 1 exists
        ]);
    }
}
