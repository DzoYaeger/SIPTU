<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NextcloudService
{
    private string $baseUrl;
    private string $username;
    private string $password;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.nextcloud.url', 'https://simpan.pom.go.id'), '/');
        $this->username = config('services.nextcloud.user', 'loka_palopo');
        $this->password = config('services.nextcloud.password', 'QA9Nq-iPerG-MpHYb-jzbCK-dH3Tf');
    }

    /**
     * Get pre-configured HTTP client with optional SSL bypass.
     */
    private function httpClient()
    {
        $client = Http::withBasicAuth($this->username, $this->password);
        if (app()->environment('local') || config('services.nextcloud.skip_ssl', true)) {
            $client->withoutVerifying();
        }
        return $client;
    }

    /**
     * Get the full WebDAV URL for a given relative path.
     */
    private function getWebdavUrl(string $path): string
    {
        $cleanPath = '/' . ltrim($path, '/');
        $parts = explode('/', $cleanPath);
        $encodedParts = array_map(function ($part) {
            return rawurlencode(rawurldecode($part));
        }, $parts);
        return "{$this->baseUrl}/remote.php/dav/files/{$this->username}" . implode('/', $encodedParts);
    }

    /**
     * Helper to recursively ensure directory exists on Nextcloud.
     */
    public function ensureDirectoryExists(string $path): void
    {
        $parts = explode('/', trim($path, '/'));
        $currentPath = '';

        foreach ($parts as $part) {
            if (empty($part)) continue;
            $currentPath .= '/' . $part;
            $url = $this->getWebdavUrl($currentPath);

            $response = $this->httpClient()
                ->withHeaders([
                    'X-Requested-With' => 'XMLHttpRequest',
                    'Depth' => '0'
                ])
                ->send('PROPFIND', $url);

            if ($response->status() === 404) {
                $mkcolResponse = $this->httpClient()
                    ->withHeaders(['X-Requested-With' => 'XMLHttpRequest'])
                    ->send('MKCOL', $url);

                if (!$mkcolResponse->successful()) {
                    Log::error("Failed to create Nextcloud directory: {$currentPath}. Status: " . $mkcolResponse->status());
                    throw new \Exception("Gagal membuat direktori di Nextcloud: {$currentPath}");
                }
            }
        }
    }

    /**
     * Upload an UploadedFile object directly to Nextcloud storage via WebDAV.
     */
    public function uploadFile(\Illuminate\Http\UploadedFile $file, string $targetFolder, string $customPrefix = ''): string
    {
        $this->ensureDirectoryExists($targetFolder);

        $originalName = $file->getClientOriginalName();
        $ext = strtolower($file->getClientOriginalExtension());
        $nameWithoutExt = pathinfo($originalName, PATHINFO_FILENAME);
        $safeName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $nameWithoutExt);

        $prefix = $customPrefix ? rtrim($customPrefix, '_') . '_' : '';
        $filename = $prefix . time() . '_' . $safeName . '.' . $ext;

        $relativePath = trim($targetFolder, '/') . '/' . $filename;
        $url = $this->getWebdavUrl($relativePath);
        $fileContents = file_get_contents($file->getRealPath());

        $response = $this->httpClient()
            ->withHeaders([
                'X-Requested-With' => 'XMLHttpRequest',
                'Content-Type' => $file->getClientMimeType()
            ])
            ->withBody($fileContents, $file->getClientMimeType())
            ->put($url);

        if (!$response->successful()) {
            Log::error("Nextcloud upload failed with status " . $response->status() . " for path: " . $relativePath);
            throw new \Exception("Gagal mengunggah berkas ke Nextcloud.");
        }

        return $relativePath;
    }

    /**
     * Delete a file from Nextcloud.
     */
    public function deleteFile(?string $relativePath): bool
    {
        if (empty($relativePath)) {
            return false;
        }

        try {
            $url = $this->getWebdavUrl($relativePath);
            $response = $this->httpClient()
                ->withHeaders(['X-Requested-With' => 'XMLHttpRequest'])
                ->delete($url);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error("Nextcloud delete error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Stream/download a file from Nextcloud.
     */
    public function streamFile(string $relativePath, bool $inline = true)
    {
        try {
            $url = $this->getWebdavUrl($relativePath);
            $response = $this->httpClient()
                ->withHeaders(['X-Requested-With' => 'XMLHttpRequest'])
                ->send('GET', $url);

            if (!$response->successful()) {
                return response()->json(['message' => 'Berkas tidak ditemukan di Nextcloud.'], 404);
            }

            $filename = basename($relativePath);
            $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            $contentType = $response->header('Content-Type');

            $mimeMap = [
                'png' => 'image/png',
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'webp' => 'image/webp',
                'gif' => 'image/gif',
                'svg' => 'image/svg+xml',
                'pdf' => 'application/pdf',
                'doc' => 'application/msword',
                'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ];

            if (isset($mimeMap[$ext])) {
                $contentType = $mimeMap[$ext];
            } else if (!$contentType || $contentType === 'application/octet-stream') {
                $contentType = 'application/octet-stream';
            }

            $disposition = $inline ? 'inline' : 'attachment';

            $res = response($response->body())
                ->header('Content-Type', $contentType)
                ->header('Content-Disposition', $disposition . '; filename="' . rawurlencode($filename) . '"');

            $contentLength = $response->header('Content-Length');
            if ($contentLength) {
                $res->header('Content-Length', $contentLength);
            }

            return $res;
        } catch (\Exception $e) {
            Log::error("Nextcloud stream error: " . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
