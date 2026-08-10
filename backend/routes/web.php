<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Fallback Route untuk Menyajikan Berkas Public Storage di Hostinger/cPanel (Solusi Symlink 404)
Route::get('/storage/{path}', function ($path) {
    $filename = basename($path);
    $candidates = [
        storage_path('app/public/' . $path),
        storage_path('app/' . $path),
        base_path('storage/app/public/' . $path),
        public_path('storage/' . $path),
        base_path('public/storage/' . $path),
        dirname(base_path()) . '/storage/app/public/' . $path,
    ];

    foreach ($candidates as $filePath) {
        if (file_exists($filePath) && !is_dir($filePath)) {
            $mimeType = @mime_content_type($filePath) ?: 'application/octet-stream';
            return response()->file($filePath, [
                'Content-Type' => $mimeType,
                'Cache-Control' => 'public, max-age=31536000',
            ]);
        }
    }

    // Fallback pencarian rekursif berkas berdasarkan nama file di seluruh folder storage
    try {
        $searchDir = storage_path();
        if (is_dir($searchDir)) {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($searchDir, RecursiveDirectoryIterator::SKIP_DOTS)
            );
            foreach ($iterator as $file) {
                if ($file->isFile() && $file->getFilename() === $filename) {
                    $foundPath = $file->getRealPath();
                    $mimeType = @mime_content_type($foundPath) ?: 'application/octet-stream';
                    return response()->file($foundPath, [
                        'Content-Type' => $mimeType,
                        'Cache-Control' => 'public, max-age=31536000',
                    ]);
                }
            }
        }
    } catch (\Throwable $e) {
        // Log error jika terjadi kendala akses sistem berkas
    }

    abort(404, 'File storage tidak ditemukan di server.');
})->where('path', '.*');



