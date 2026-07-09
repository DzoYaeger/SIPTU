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
        $this->baseUrl = rtrim(env('NEXTCLOUD_URL', 'https://simpan.pom.go.id'), '/');
        $this->username = env('NEXTCLOUD_USER', 'loka_palopo');
        $this->password = env('NEXTCLOUD_PASSWORD', 'QA9Nq-iPerG-MpHYb-jzbCK-dH3Tf');
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
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withHeaders([
                    'X-Requested-With' => 'XMLHttpRequest',
                    'Depth' => '0'
                ])
                ->send('PROPFIND', $url);

            if ($response->status() === 404) {
                // Folder does not exist, create it
                $mkcolResponse = Http::withBasicAuth($this->username, $this->password)
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

        $targetDir = "SIPTU_Backup/{$targetNip}";

        try {
            // Ensure the backup directory exists
            $this->ensureDirectoryExists($targetDir);

            // Get directory listing
            $url = $this->getWebdavUrl($targetDir);
            $response = Http::withBasicAuth($this->username, $this->password)
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
            $xml = simplexml_load_string($xmlStr);
            $files = [];

            if ($xml) {
                $xml->registerXPathNamespace('d', 'DAV:');
                $responses = $xml->xpath('//d:response');

                foreach ($responses as $res) {
                    $href = (string)($res->xpath('d:href')[0] ?? '');
                    $decodedHref = urldecode($href);
                    
                    // Convert href to relative path
                    $prefix = "/remote.php/dav/files/{$this->username}";
                    $relativePath = str_replace($prefix, '', $decodedHref);

                    // Skip the requested directory itself
                    if (rtrim($relativePath, '/') === rtrim('/' . $targetDir, '/')) {
                        continue;
                    }

                    $prop = $res->xpath('d:propstat/d:prop')[0] ?? null;
                    if ($prop) {
                        $lastModified = (string)($prop->xpath('d:getlastmodified')[0] ?? '');
                        $size = (string)($prop->xpath('d:getcontentlength')[0] ?? '0');
                        $contentType = (string)($prop->xpath('d:getcontenttype')[0] ?? '');

                        $resourcetype = $prop->xpath('d:resourcetype')[0] ?? null;
                        $isDir = ($resourcetype && $resourcetype->xpath('d:collection')) ? true : false;

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

        $targetDir = "SIPTU_Backup/{$targetNip}";
        $file = $request->file('file');

        try {
            $this->ensureDirectoryExists($targetDir);

            $originalName = $file->getClientOriginalName();
            // Sanitize filename to avoid special char issues in WebDAV paths
            $safeName = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $originalName);

            $url = $this->getWebdavUrl($targetDir . '/' . $safeName);
            $fileContents = file_get_contents($file->getRealPath());

            $uploadResponse = Http::withBasicAuth($this->username, $this->password)
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
     * Download (proxy stream) a file from Nextcloud.
     */
    public function download(Request $request)
    {
        $request->validate([
            'path' => 'required|string',
        ]);

        $path = $request->query('path');
        $currentUser = $request->user();

        // 🛡️ Security Check 1: Must be inside SIPTU_Backup
        $cleanPath = '/' . ltrim($path, '/');
        if (!str_starts_with($cleanPath, '/SIPTU_Backup/')) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        // 🛡️ Security Check 2: Non-admins can only download their own NIP folder files
        if ($currentUser->base_role !== 'admin') {
            $expectedPrefix = '/SIPTU_Backup/' . $currentUser->nip . '/';
            if (!str_starts_with($cleanPath, $expectedPrefix)) {
                return response()->json(['message' => 'Anda tidak memiliki akses ke berkas ini.'], 403);
            }
        }

        try {
            $url = $this->getWebdavUrl($cleanPath);
            $response = Http::withBasicAuth($this->username, $this->password)
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

        // 🛡️ Security Check 1: Must be inside SIPTU_Backup
        $cleanPath = '/' . ltrim($path, '/');
        if (!str_starts_with($cleanPath, '/SIPTU_Backup/')) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        // 🛡️ Security Check 2: Non-admins can only delete their own NIP folder files
        if ($currentUser->base_role !== 'admin') {
            $expectedPrefix = '/SIPTU_Backup/' . $currentUser->nip . '/';
            if (!str_starts_with($cleanPath, $expectedPrefix)) {
                return response()->json(['message' => 'Anda tidak memiliki akses untuk menghapus berkas ini.'], 403);
            }
        }

        try {
            $url = $this->getWebdavUrl($cleanPath);
            $response = Http::withBasicAuth($this->username, $this->password)
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
}
