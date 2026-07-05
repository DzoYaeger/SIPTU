<?php
/**
 * Proxy untuk serve gambar dari public/storage
 * Letakkan file ini di public_html/storage/hero-slider/index.php
 * 
 * URL: https://siptu.bpompalopo.com/storage/hero-slider/hero-xxx.png
 * Akan di-redirect ke: https://siptu.bpompalopo.com/core_api/public/storage/hero-slider/hero-xxx.png
 */

$requestUri = $_SERVER['REQUEST_URI'] ?? '';

// Jika akses ke file yang ada, serve langsung
$file = basename($requestUri);
$sourceFile = __DIR__ . '/../../core_api/public/storage/hero-slider/' . $file;

if (file_exists($sourceFile) && is_file($sourceFile)) {
    // Get mime type
    $mimeTypes = [
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
    ];
    
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $mimeType = $mimeTypes[$ext] ?? 'application/octet-stream';
    
    header('Content-Type: ' . $mimeType);
    header('Cache-Control: public, max-age=86400');
    readfile($sourceFile);
    exit;
}

// File tidak ditemukan
http_response_code(404);
echo 'File not found';
