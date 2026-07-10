<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Employee;

class NextcloudStorageController extends Controller
{
    private $baseUrl;
    private $username;
    private $password;

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
    private function getWebdavUrl($path)
    {
        $cleanPath = '/' . ltrim($path, '/');
        return "{$this->baseUrl}/remote.php/dav/files/{$this->username}{$cleanPath}";
    }

    /**
     * Helper to recursively ensure directory exists on Nextcloud.
     */
    private function ensureDirectoryExists($path)
    {
        $parts = explode('/', trim($path, '/'));
        $currentPath = '';

        foreach ($parts as $part) {
            if (empty($part)) continue;
            $currentPath .= '/' . $part;
            $url = $this->getWebdavUrl($currentPath);

            // Send PROPFIND to check if folder exists
            $response = $this->httpClient()
                ->withHeaders([
                    'X-Requested-With' => 'XMLHttpRequest',
                    'Depth' => '0'
                ])
                ->send('PROPFIND', $url);

            if ($response->status() === 404) {
                // Folder does not exist, create it
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
     * List files in the employee's private storage folder.
     */
    public function index(Request $request)
    {
        $currentUser = $request->user();
        $targetNip = $currentUser->nip;

        // Admins can view other employee's folders
        if ($currentUser->base_role === 'admin' && $request->filled('nip')) {
            $targetNip = $request->query('nip');
        }

        if (empty($targetNip)) {
            return response()->json(['message' => 'NIP pegawai tidak ditemukan.'], 400);
        }

        $baseDir = "SIPTU Drive/{$targetNip}";
        
        // Support subfolder navigation via 'path' parameter
        $subPath = $request->query('path', '');
        if ($subPath) {
            // Security: prevent directory traversal
            $subPath = str_replace('..', '', $subPath);
            $subPath = ltrim($subPath, '/');
            $targetDir = $baseDir . '/' . $subPath;
        } else {
            $targetDir = $baseDir;
        }

        try {
            // Ensure the backup directory exists
            $this->ensureDirectoryExists($targetDir);

            // Get directory listing
            $url = $this->getWebdavUrl($targetDir);
            $response = $this->httpClient()
                ->withHeaders([
                    'X-Requested-With' => 'XMLHttpRequest',
                    'Depth' => '1' // Get immediate children
                ])
                ->send('PROPFIND', $url);

            if (!$response->successful()) {
                return response()->json([
                    'message' => 'Gagal mengambil data dari Nextcloud.',
                    'status' => $response->status()
                ], 500);
            }

            $xmlStr = $response->body();
            $files = [];

            $dom = new \DOMDocument();
            if (@$dom->loadXML($xmlStr)) {
                $xpath = new \DOMXPath($dom);
                $xpath->registerNamespace('d', 'DAV:');
                $responseNodes = $xpath->query('//d:response');

                foreach ($responseNodes as $node) {
                    $hrefNodes = $xpath->query('d:href', $node);
                    $href = $hrefNodes->length > 0 ? $hrefNodes->item(0)->textContent : '';
                    $decodedHref = urldecode($href);
                    
                    // Convert href to relative path
                    $prefix = "/remote.php/dav/files/{$this->username}";
                    $relativePath = str_replace($prefix, '', $decodedHref);

                    // Skip the requested directory itself
                    if (rtrim($relativePath, '/') === rtrim('/' . $targetDir, '/')) {
                        continue;
                    }

                    $propNodes = $xpath->query('d:propstat/d:prop', $node);
                    if ($propNodes->length > 0) {
                        $prop = $propNodes->item(0);
                        
                        $lastModifiedNodes = $xpath->query('d:getlastmodified', $prop);
                        $lastModified = $lastModifiedNodes->length > 0 ? $lastModifiedNodes->item(0)->textContent : '';
                        
                        $sizeNodes = $xpath->query('d:getcontentlength', $prop);
                        $size = $sizeNodes->length > 0 ? $sizeNodes->item(0)->textContent : '0';
                        
                        $contentTypeNodes = $xpath->query('d:getcontenttype', $prop);
                        $contentType = $contentTypeNodes->length > 0 ? $contentTypeNodes->item(0)->textContent : '';
                        
                        $collectionNodes = $xpath->query('d:resourcetype/d:collection', $prop);
                        $isDir = $collectionNodes->length > 0;

                        $name = basename(rtrim($relativePath, '/'));

                        $files[] = [
                            'name' => $name,
                            'path' => $relativePath,
                            'size' => $isDir ? null : (int)$size,
                            'is_dir' => $isDir,
                            'last_modified' => $lastModified ? date('Y-m-d H:i:s', strtotime($lastModified)) : null,
                            'content_type' => $contentType,
                        ];
                    }
                }
            }

            // Sort files: directories first, then alphabetically by name
            usort($files, function ($a, $b) {
                if ($a['is_dir'] !== $b['is_dir']) {
                    return $b['is_dir'] ? 1 : -1;
                }
                return strcmp(strtolower($a['name']), strtolower($b['name']));
            });

            return response()->json([
                'folder' => '/' . $targetDir,
                'files' => $files,
                'employee' => Employee::where('nip', $targetNip)->first()
            ]);

        } catch (\Exception $e) {
            Log::error("Nextcloud list files error: " . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Upload a file to the employee's storage.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:256000', // max 250MB (within Hostinger limit)
        ]);

        $currentUser = $request->user();
        $targetNip = $currentUser->nip;

        if ($currentUser->base_role === 'admin' && $request->filled('nip')) {
            $targetNip = $request->input('nip');
        }

        if (empty($targetNip)) {
            return response()->json(['message' => 'NIP pegawai tidak ditemukan.'], 400);
        }

        $baseDir = "SIPTU Drive/{$targetNip}";
        $subPath = $request->input('path', '');
        if ($subPath) {
            $subPath = str_replace('..', '', $subPath);
            $subPath = ltrim($subPath, '/');
            $targetDir = $baseDir . '/' . $subPath;
        } else {
            $targetDir = $baseDir;
        }
        $file = $request->file('file');

        try {
            $this->ensureDirectoryExists($targetDir);

            $originalName = $file->getClientOriginalName();
            // Sanitize filename to avoid special char issues in WebDAV paths
            $safeName = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $originalName);

            $url = $this->getWebdavUrl($targetDir . '/' . $safeName);
            $fileContents = file_get_contents($file->getRealPath());

            $uploadResponse = $this->httpClient()
                ->withHeaders([
                    'X-Requested-With' => 'XMLHttpRequest',
                    'Content-Type' => $file->getClientMimeType()
                ])
                ->withBody($fileContents, $file->getClientMimeType())
                ->put($url);

            if (!$uploadResponse->successful()) {
                Log::error("Nextcloud upload failed with status " . $uploadResponse->status());
                return response()->json([
                    'message' => 'Gagal mengunggah berkas ke Nextcloud.',
                    'status' => $uploadResponse->status()
                ], 500);
            }

            return response()->json([
                'message' => 'Berkas berhasil diunggah.',
                'file' => [
                    'name' => $safeName,
                    'path' => '/' . $targetDir . '/' . $safeName,
                    'size' => $file->getSize(),
                    'is_dir' => false,
                    'last_modified' => date('Y-m-d H:i:s'),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Nextcloud upload error: " . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Create a new folder in the employee's storage.
     */
    public function createFolder(Request $request)
    {
        $request->validate([
            'folder_name' => 'required|string|max:255',
        ]);

        $currentUser = $request->user();
        $targetNip = $currentUser->nip;

        if ($currentUser->base_role === 'admin' && $request->filled('nip')) {
            $targetNip = $request->input('nip');
        }

        if (empty($targetNip)) {
            return response()->json(['message' => 'NIP pegawai tidak ditemukan.'], 400);
        }

        $baseDir = "SIPTU Drive/{$targetNip}";
        $subPath = $request->input('path', '');
        if ($subPath) {
            $subPath = str_replace('..', '', $subPath);
            $subPath = ltrim($subPath, '/');
            $baseDir = $baseDir . '/' . $subPath;
        }

        $folderName = preg_replace('/[^a-zA-Z0-9_\-\. ]/', '_', $request->input('folder_name'));
        $fullPath = $baseDir . '/' . $folderName;

        try {
            $this->ensureDirectoryExists($fullPath);

            return response()->json([
                'message' => 'Folder berhasil dibuat.',
                'folder' => [
                    'name' => $folderName,
                    'path' => '/' . $fullPath,
                    'is_dir' => true,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("Nextcloud create folder error: " . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Download (proxy stream) a file from Nextcloud.
     */
    public function download(Request $request)
    {
        $request->validate([
            'path' => 'required|string',
        ]);

        $path = $request->query('path');
        $currentUser = $request->user();

        // 🛡️ Security Check 1: Must be inside SIPTU Drive
        $cleanPath = '/' . ltrim($path, '/');
        if (!str_starts_with($cleanPath, '/SIPTU Drive/')) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        // 🛡️ Security Check 2: Non-admins can only download their own NIP folder files
        if ($currentUser->base_role !== 'admin') {
            $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip . '/';
            if (!str_starts_with($cleanPath, $expectedPrefix)) {
                return response()->json(['message' => 'Anda tidak memiliki akses ke berkas ini.'], 403);
            }
        }

        try {
            $url = $this->getWebdavUrl($cleanPath);
            $response = $this->httpClient()
                ->withHeaders(['X-Requested-With' => 'XMLHttpRequest'])
                ->send('GET', $url);

            if (!$response->successful()) {
                return response()->json([
                    'message' => 'Berkas tidak ditemukan di Nextcloud.',
                    'status' => $response->status()
                ], 404);
            }

            $filename = basename($cleanPath);
            $contentType = $response->header('Content-Type') ?: 'application/octet-stream';

            return response($response->body())
                ->header('Content-Type', $contentType)
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');

        } catch (\Exception $e) {
            Log::error("Nextcloud download error: " . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete a file/folder from Nextcloud.
     */
    public function destroy(Request $request)
    {
        $request->validate([
            'path' => 'required|string',
        ]);

        $path = $request->query('path');
        $currentUser = $request->user();

        // 🛡️ Security Check 1: Must be inside SIPTU Drive
        $cleanPath = '/' . ltrim($path, '/');
        if (!str_starts_with($cleanPath, '/SIPTU Drive/')) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        // 🛡️ Security Check 2: Non-admins can only delete their own NIP folder files
        if ($currentUser->base_role !== 'admin') {
            $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip . '/';
            if (!str_starts_with($cleanPath, $expectedPrefix)) {
                return response()->json(['message' => 'Anda tidak memiliki akses untuk menghapus berkas ini.'], 403);
            }
        }

        try {
            $url = $this->getWebdavUrl($cleanPath);
            $response = $this->httpClient()
                ->withHeaders(['X-Requested-With' => 'XMLHttpRequest'])
                ->delete($url);

            if (!$response->successful()) {
                return response()->json([
                    'message' => 'Gagal menghapus berkas di Nextcloud.',
                    'status' => $response->status()
                ], 500);
            }

            return response()->json(['message' => 'Berkas berhasil dihapus.']);

        } catch (\Exception $e) {
            Log::error("Nextcloud delete error: " . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Membuat token enkripsi untuk sharing berkas.
     */
    public function getShareToken(Request $request)
    {
        $request->validate([
            'path' => 'required|string',
        ]);
        
        $path = $request->query('path');
        $currentUser = $request->user();
        $cleanPath = '/' . ltrim($path, '/');

        // Security Check: Non-admins can only share their own NIP folder files
        if ($currentUser->base_role !== 'admin') {
            $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip . '/';
            if (!str_starts_with($cleanPath, $expectedPrefix)) {
                return response()->json(['message' => 'Anda tidak memiliki akses untuk membagikan berkas ini.'], 403);
            }
        }

        try {
            $token = base64_encode(\Illuminate\Support\Facades\Crypt::encryptString($cleanPath));
            return response()->json([
                'token' => $token
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal membuat tautan berbagi.'], 500);
        }
    }

    /**
     * Mengambil metadata berkas secara publik berdasarkan share token.
     */
    public function shareInfo($token)
    {
        try {
            $path = \Illuminate\Support\Facades\Crypt::decryptString(base64_decode($token));
            
            // Security Check: Must start with SIPTU Drive
            $cleanPath = '/' . ltrim($path, '/');
            if (!str_starts_with($cleanPath, '/SIPTU Drive/')) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            $url = $this->getWebdavUrl($cleanPath);
            $response = $this->httpClient()
                ->withHeaders([
                    'X-Requested-With' => 'XMLHttpRequest',
                    'Depth' => '0'
                ])
                ->send('PROPFIND', $url);

            if (!$response->successful()) {
                return response()->json(['message' => 'Berkas tidak ditemukan atau telah dihapus.'], 404);
            }

            $xmlStr = $response->body();
            $dom = new \DOMDocument();
            if (@$dom->loadXML($xmlStr)) {
                $xpath = new \DOMXPath($dom);
                $xpath->registerNamespace('d', 'DAV:');
                $responseNodes = $xpath->query('//d:response');
                
                if ($responseNodes->length > 0) {
                    $node = $responseNodes->item(0);
                    $propstatNodes = $xpath->query('d:propstat/d:prop', $node);
                    if ($propstatNodes->length > 0) {
                        $propNode = $propstatNodes->item(0);
                        $displayNameNodes = $xpath->query('d:displayname', $propNode);
                        $getcontentlengthNodes = $xpath->query('d:getcontentlength', $propNode);
                        
                        $name = $displayNameNodes->length > 0 ? $displayNameNodes->item(0)->textContent : basename($cleanPath);
                        $size = $getcontentlengthNodes->length > 0 ? (int)$getcontentlengthNodes->item(0)->textContent : 0;

                        return response()->json([
                            'name' => $name,
                            'size' => $size,
                            'path' => $cleanPath
                        ]);
                    }
                }
            }
            
            return response()->json(['message' => 'Gagal membaca data berkas.'], 500);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Tautan berbagi tidak valid atau telah kedaluwarsa.'], 400);
        }
    }

    /**
     * Mengunduh berkas secara publik berdasarkan share token.
     */
    public function shareDownload($token)
    {
        try {
            $path = \Illuminate\Support\Facades\Crypt::decryptString(base64_decode($token));
            
            // Security Check: Must start with SIPTU Drive
            $cleanPath = '/' . ltrim($path, '/');
            if (!str_starts_with($cleanPath, '/SIPTU Drive/')) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            $url = $this->getWebdavUrl($cleanPath);
            
            $response = $this->httpClient()
                ->withHeaders(['X-Requested-With' => 'XMLHttpRequest'])
                ->send('GET', $url);

            if (!$response->successful()) {
                return response()->json(['message' => 'Gagal mengunduh berkas.'], 404);
            }

            $contentType = $response->header('Content-Type') ?: 'application/octet-stream';
            $fileName = basename($cleanPath);

            return response($response->body(), 200, [
                'Content-Type' => $contentType,
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Tautan tidak valid atau telah kedaluwarsa.'], 400);
        }
    }

    /**
     * Menyimpan/menimpa perubahan berkas di Nextcloud.
     */
    public function saveFile(Request $request)
    {
        $request->validate([
            'file' => 'required|file',
            'path' => 'required|string',
        ]);

        $path = $request->input('path');
        $currentUser = $request->user();
        $cleanPath = '/' . ltrim($path, '/');

        // 🛡️ Security Check: Must be inside SIPTU Drive
        if (!str_starts_with($cleanPath, '/SIPTU Drive/')) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        // 🛡️ Security Check: Non-admins can only save files in their own NIP folder
        if ($currentUser->base_role !== 'admin') {
            $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip . '/';
            if (!str_starts_with($cleanPath, $expectedPrefix)) {
                return response()->json(['message' => 'Anda tidak memiliki akses untuk menyimpan berkas ini.'], 403);
            }
        }

        $file = $request->file('file');

        try {
            $url = $this->getWebdavUrl($cleanPath);
            $fileContents = file_get_contents($file->getRealPath());

            $response = $this->httpClient()
                ->withHeaders([
                    'X-Requested-With' => 'XMLHttpRequest',
                    'Content-Type' => $file->getClientMimeType()
                ])
                ->withBody($fileContents, $file->getClientMimeType())
                ->send('PUT', $url);

            if (!$response->successful() && $response->status() !== 201 && $response->status() !== 204) {
                return response()->json([
                    'message' => 'Gagal menyimpan berkas ke Nextcloud.',
                    'status' => $response->status()
                ], 500);
            }

            return response()->json(['message' => 'Berkas berhasil disimpan.']);
        } catch (\Exception $e) {
            Log::error("Nextcloud save error: " . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
