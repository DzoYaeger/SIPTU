<?php
/**
 * Index file untuk serve gambar dari storage/hero-slider/
 * Letakkan ini di: public_html/storage/hero-slider/index.php
 */

$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$file = basename($requestUri);

// Path ke file gambar (di core_api/public/storage/hero-slider/)
$sourceFile = __DIR__ . '/../../core_api/public/storage/hero-slider/' . $file;

// Jika file tidak ada, return 404
if (!file_exists($sourceFile) || !is_file($sourceFile)) {
    http_response_code(404);
    header('Content-Type: text/plain');
    echo 'File not found: ' . $file;
    exit;
}

// Get file extension
$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));

// Set content type
$mimeTypes = [
    'svg' => 'image/svg+xml',
    'png' => 'image/png',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'webp' => 'image/webp',
];

$mimeType = $mimeTypes[$ext] ?? 'application/octet-stream';

// Set headers
header('Content-Type: ' . $mimeType);
header('Content-Length: ' . filesize($sourceFile));
header('Cache-Control: public, max-age=86400');
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($sourceFile)) . ' GMT');

// Output file
readfile($sourceFile);
exit;
