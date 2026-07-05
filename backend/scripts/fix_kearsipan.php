<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

DB::table('archive_units')
    ->where('fungsi_bidang', 'like', '%keasipan%')
    ->update([
        'fungsi_bidang' => DB::raw("REPLACE(fungsi_bidang, 'keasipan', 'kearsipan')"),
    ]);
