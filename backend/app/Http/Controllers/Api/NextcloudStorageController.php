<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Employee;
use App\Models\NextcloudShare;

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

            // Load shared paths for this folder
            $cleanTargetDir = '/' . ltrim($targetDir, '/');
            $sharedPaths = NextcloudShare::where('path', 'like', $cleanTargetDir . '%')
                ->get()
                ->keyBy('path');

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
                        $cleanRelative = '/' . ltrim($relativePath, '/');
                        $isShared = isset($sharedPaths[$cleanRelative]);

                        $files[] = [
                            'name' => $name,
                            'path' => $relativePath,
                            'size' => $isDir ? null : (int)$size,
                            'is_dir' => $isDir,
                            'last_modified' => $lastModified ? date('Y-m-d H:i:s', strtotime($lastModified)) : null,
                            'content_type' => $contentType,
                            'is_shared' => $isShared,
                            'share_token' => $isShared ? $sharedPaths[$cleanRelative]->token : null,
                            'can_edit' => $isShared ? $sharedPaths[$cleanRelative]->can_edit : false,
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

            $contentLength = $response->header('Content-Length');
            $filename = basename($cleanPath);
            $contentType = $response->header('Content-Type') ?: 'application/octet-stream';

            $res = response($response->body())
                ->header('Content-Type', $contentType)
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
            if ($contentLength) {
                $res->header('Content-Length', $contentLength);
            }
            return $res;

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
    public function shareInfo(Request $request, $token)
    {
        try {
            $basePath = \Illuminate\Support\Facades\Crypt::decryptString(base64_decode($token));
            
            // Security Check: Must start with SIPTU Drive
            $cleanBasePath = '/' . ltrim($basePath, '/');
            if (!str_starts_with($cleanBasePath, '/SIPTU Drive/')) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            $share = NextcloudShare::where('token', $token)->first();
            if (!$share) {
                return response()->json(['message' => 'Tautan berbagi tidak valid atau telah dinonaktifkan.'], 404);
            }
            $canEdit = (bool)$share->can_edit;

            // Support navigation to subfolders
            $subPath = $request->query('path', '');
            $subPath = str_replace('..', '', $subPath);
            $subPath = ltrim($subPath, '/');
            
            $targetPath = $cleanBasePath;
            if (!empty($subPath)) {
                $targetPath .= '/' . $subPath;
            }
            $cleanTargetPath = '/' . ltrim($targetPath, '/');

            // Security Check: Target path must remain within base shared directory
            if (!str_starts_with($cleanTargetPath, $cleanBasePath)) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            $url = $this->getWebdavUrl($cleanTargetPath);
            $response = $this->httpClient()
                ->withHeaders([
                    'X-Requested-With' => 'XMLHttpRequest',
                    'Depth' => '1' // Query children if it is a folder
                ])
                ->send('PROPFIND', $url);

            if (!$response->successful()) {
                return response()->json(['message' => 'Berkas atau folder tidak ditemukan atau telah dihapus.'], 404);
            }

            $xmlStr = $response->body();
            $dom = new \DOMDocument();
            if (@$dom->loadXML($xmlStr)) {
                $xpath = new \DOMXPath($dom);
                $xpath->registerNamespace('d', 'DAV:');
                $responseNodes = $xpath->query('//d:response');
                
                if ($responseNodes->length > 0) {
                    // Node 0 represents the targeted resource itself
                    $targetNode = $responseNodes->item(0);
                    $targetPropNodes = $xpath->query('d:propstat/d:prop', $targetNode);
                    
                    $isDir = false;
                    $targetName = basename(rtrim($cleanTargetPath, '/'));
                    $targetSize = 0;
                    $targetLastModified = null;
                    $targetContentType = '';

                    if ($targetPropNodes->length > 0) {
                        $prop = $targetPropNodes->item(0);
                        
                        $collectionNodes = $xpath->query('d:resourcetype/d:collection', $prop);
                        $isDir = $collectionNodes->length > 0;
                        
                        $displayNameNodes = $xpath->query('d:displayname', $prop);
                        if ($displayNameNodes->length > 0) {
                            $targetName = $displayNameNodes->item(0)->textContent;
                        }
                        
                        $sizeNodes = $xpath->query('d:getcontentlength', $prop);
                        $targetSize = $sizeNodes->length > 0 ? (int)$sizeNodes->item(0)->textContent : 0;
                        
                        $lastModifiedNodes = $xpath->query('d:getlastmodified', $prop);
                        if ($lastModifiedNodes->length > 0) {
                            $targetLastModified = date('Y-m-d H:i:s', strtotime($lastModifiedNodes->item(0)->textContent));
                        }
                        
                        $contentTypeNodes = $xpath->query('d:getcontenttype', $prop);
                        if ($contentTypeNodes->length > 0) {
                            $targetContentType = $contentTypeNodes->item(0)->textContent;
                        }
                    }

                    $files = [];
                    if ($isDir) {
                        $prefix = "/remote.php/dav/files/{$this->username}";
                        foreach ($responseNodes as $index => $node) {
                            if ($index === 0) continue; // Skip target node
                            
                            $hrefNodes = $xpath->query('d:href', $node);
                            $href = $hrefNodes->length > 0 ? urldecode($hrefNodes->item(0)->textContent) : '';
                            $relativePath = str_replace($prefix, '', $href);
                            
                            $propNodes = $xpath->query('d:propstat/d:prop', $node);
                            if ($propNodes->length > 0) {
                                $prop = $propNodes->item(0);
                                
                                $lastModifiedNodes = $xpath->query('d:getlastmodified', $prop);
                                $lastModified = $lastModifiedNodes->length > 0 ? date('Y-m-d H:i:s', strtotime($lastModifiedNodes->item(0)->textContent)) : null;
                                
                                $sizeNodes = $xpath->query('d:getcontentlength', $prop);
                                $size = $sizeNodes->length > 0 ? (int)$sizeNodes->item(0)->textContent : 0;
                                
                                $contentTypeNodes = $xpath->query('d:getcontenttype', $prop);
                                $contentType = $contentTypeNodes->length > 0 ? $contentTypeNodes->item(0)->textContent : '';
                                
                                $collectionNodes = $xpath->query('d:resourcetype/d:collection', $prop);
                                $childIsDir = $collectionNodes->length > 0;
                                
                                $name = basename(rtrim($relativePath, '/'));
                                
                                $files[] = [
                                    'name' => $name,
                                    'path' => $relativePath,
                                    'size' => $childIsDir ? null : $size,
                                    'is_dir' => $childIsDir,
                                    'last_modified' => $lastModified,
                                    'content_type' => $contentType,
                                ];
                            }
                        }
                        
                        // Sort: directories first, then alphabetical
                        usort($files, function ($a, $b) {
                            if ($a['is_dir'] !== $b['is_dir']) {
                                return $b['is_dir'] ? 1 : -1;
                            }
                            return strcmp(strtolower($a['name']), strtolower($b['name']));
                        });
                    }

                    return response()->json([
                        'name' => $targetName,
                        'size' => $targetSize,
                        'path' => $cleanTargetPath,
                        'is_dir' => $isDir,
                        'last_modified' => $targetLastModified,
                        'content_type' => $targetContentType,
                        'files' => $isDir ? $files : null,
                        'base_path' => $cleanBasePath,
                        'can_edit' => $canEdit,
                    ]);
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
    public function shareDownload(Request $request, $token)
    {
        try {
            $basePath = \Illuminate\Support\Facades\Crypt::decryptString(base64_decode($token));
            
            // Security Check: Must start with SIPTU Drive
            $cleanBasePath = '/' . ltrim($basePath, '/');
            if (!str_starts_with($cleanBasePath, '/SIPTU Drive/')) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            // Support downloading file inside a shared folder
            $subPath = $request->query('path', '');
            $subPath = str_replace('..', '', $subPath);
            $subPath = ltrim($subPath, '/');
            
            $targetPath = $cleanBasePath;
            if (!empty($subPath)) {
                $targetPath .= '/' . $subPath;
            }
            $cleanTargetPath = '/' . ltrim($targetPath, '/');

            // Security Check: Target path must remain within base shared directory
            if (!str_starts_with($cleanTargetPath, $cleanBasePath)) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            $url = $this->getWebdavUrl($cleanTargetPath);
            
            $response = $this->httpClient()
                ->withHeaders(['X-Requested-With' => 'XMLHttpRequest'])
                ->send('GET', $url);

            if (!$response->successful()) {
                return response()->json(['message' => 'Gagal mengunduh berkas.'], 404);
            }

            $contentLength = $response->header('Content-Length');
            $contentType = $response->header('Content-Type') ?: 'application/octet-stream';
            $fileName = basename($cleanTargetPath);
            $disposition = $request->query('inline') === '1' ? 'inline' : 'attachment';

            $headers = [
                'Content-Type' => $contentType,
                'Content-Disposition' => $disposition . '; filename="' . $fileName . '"',
            ];
            if ($contentLength) {
                $headers['Content-Length'] = $contentLength;
            }

            return response($response->body(), 200, $headers);
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

    /**
     * Helper to perform WebDAV MOVE or COPY.
     */
    private function webdavMoveOrCopy($sourcePath, $destPath, $action = 'MOVE')
    {
        $sourceUrl = $this->getWebdavUrl($sourcePath);
        $destUrl = $this->getWebdavUrl($destPath);

        $response = $this->httpClient()
            ->withHeaders([
                'X-Requested-With' => 'XMLHttpRequest',
                'Destination' => $destUrl,
                'Overwrite' => 'F'
            ])
            ->send($action, $sourceUrl);

        return $response;
    }

    public function getShareSettings(Request $request)
    {
        $request->validate(['path' => 'required|string']);
        $path = '/' . ltrim($request->query('path'), '/');
        $currentUser = $request->user();

        // Security check
        if (!str_starts_with($path, '/SIPTU Drive/')) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }
        if ($currentUser->base_role !== 'admin') {
            $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip . '/';
            if (!str_starts_with($path, $expectedPrefix)) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }
        }

        $share = NextcloudShare::where('path', $path)->first();

        return response()->json([
            'is_shared' => !empty($share),
            'token' => $share ? $share->token : null,
            'can_edit' => $share ? (bool)$share->can_edit : false,
        ]);
    }

    public function updateShareSettings(Request $request)
    {
        $request->validate([
            'path' => 'required|string',
            'can_edit' => 'required|boolean',
        ]);
        
        $path = '/' . ltrim($request->input('path'), '/');
        $canEdit = $request->input('can_edit');
        $currentUser = $request->user();

        // Security check
        if (!str_starts_with($path, '/SIPTU Drive/')) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }
        if ($currentUser->base_role !== 'admin') {
            $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip . '/';
            if (!str_starts_with($path, $expectedPrefix)) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }
        }

        $share = NextcloudShare::where('path', $path)->first();

        if ($share) {
            $share->update(['can_edit' => $canEdit]);
        } else {
            // Generate token
            $token = base64_encode(\Illuminate\Support\Facades\Crypt::encryptString($path));
            $share = NextcloudShare::create([
                'path' => $path,
                'token' => $token,
                'can_edit' => $canEdit,
            ]);
        }

        return response()->json([
            'is_shared' => true,
            'token' => $share->token,
            'can_edit' => (bool)$share->can_edit,
        ]);
    }

    public function deleteShareSettings(Request $request)
    {
        $request->validate(['path' => 'required|string']);
        $path = '/' . ltrim($request->query('path'), '/');
        $currentUser = $request->user();

        // Security check
        if (!str_starts_with($path, '/SIPTU Drive/')) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }
        if ($currentUser->base_role !== 'admin') {
            $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip . '/';
            if (!str_starts_with($path, $expectedPrefix)) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }
        }

        NextcloudShare::where('path', $path)->delete();

        return response()->json(['message' => 'Berbagi dihentikan.']);
    }

    public function move(Request $request)
    {
        $request->validate([
            'source_path' => 'required|string',
            'dest_path' => 'required|string',
        ]);

        $source = '/' . ltrim($request->input('source_path'), '/');
        $dest = '/' . ltrim($request->input('dest_path'), '/');
        $currentUser = $request->user();

        // Security Check 1: Must be inside SIPTU Drive
        if (!str_starts_with($source, '/SIPTU Drive/') || !str_starts_with($dest, '/SIPTU Drive/')) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        // Security Check 2: Non-admins can only move within their own folder
        if ($currentUser->base_role !== 'admin') {
            $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip . '/';
            if (!str_starts_with($source, $expectedPrefix) || !str_starts_with($dest, $expectedPrefix)) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }
        }

        try {
            $this->ensureDirectoryExists(dirname($dest));
            $response = $this->webdavMoveOrCopy($source, $dest, 'MOVE');

            if ($response->status() === 412) {
                return response()->json(['message' => 'Berkas tujuan sudah ada.'], 412);
            }

            if (!$response->successful() && $response->status() !== 201 && $response->status() !== 204) {
                return response()->json(['message' => 'Gagal memindahkan berkas.'], 500);
            }

            NextcloudShare::where('path', $source)->update(['path' => $dest]);

            return response()->json(['message' => 'Item berhasil dipindahkan.']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function copy(Request $request)
    {
        $request->validate([
            'source_path' => 'required|string',
            'dest_path' => 'required|string',
        ]);

        $source = '/' . ltrim($request->input('source_path'), '/');
        $dest = '/' . ltrim($request->input('dest_path'), '/');
        $currentUser = $request->user();

        // Security Check 1: Must be inside SIPTU Drive
        if (!str_starts_with($source, '/SIPTU Drive/') || !str_starts_with($dest, '/SIPTU Drive/')) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        // Security Check 2: Non-admins can only copy within their own folder
        if ($currentUser->base_role !== 'admin') {
            $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip . '/';
            if (!str_starts_with($source, $expectedPrefix) || !str_starts_with($dest, $expectedPrefix)) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }
        }

        try {
            $this->ensureDirectoryExists(dirname($dest));
            $response = $this->webdavMoveOrCopy($source, $dest, 'COPY');

            if ($response->status() === 412) {
                return response()->json(['message' => 'Berkas tujuan sudah ada.'], 412);
            }

            if (!$response->successful() && $response->status() !== 201 && $response->status() !== 204) {
                return response()->json(['message' => 'Gagal menyalin berkas.'], 500);
            }

            return response()->json(['message' => 'Item berhasil disalin.']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Helper to retrieve and check public share permissions.
     */
    private function getPublicShareWithWritePermission($token)
    {
        $share = NextcloudShare::where('token', $token)->firstOrFail();
        if (!$share->can_edit) {
            abort(response()->json(['message' => 'Akses ditolak. Pengeditan tidak diizinkan.'], 403));
        }
        $basePath = \Illuminate\Support\Facades\Crypt::decryptString(base64_decode($token));
        return '/' . ltrim($basePath, '/');
    }

    public function shareCreateFolder(Request $request, $token)
    {
        $request->validate([
            'path' => 'nullable|string',
            'folder_name' => 'required|string|max:255',
        ]);

        try {
            $basePath = $this->getPublicShareWithWritePermission($token);

            $subPath = $request->input('path', '');
            $subPath = str_replace('..', '', $subPath);
            $subPath = ltrim($subPath, '/');

            $targetPath = $basePath;
            if (!empty($subPath)) {
                $targetPath .= '/' . $subPath;
            }

            $folderName = preg_replace('/[^a-zA-Z0-9_\-\. ]/', '_', $request->input('folder_name'));
            $fullPath = '/' . ltrim($targetPath . '/' . $folderName, '/');

            // Security check: Target path must start with base shared path
            if (!str_starts_with($fullPath, $basePath)) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            $this->ensureDirectoryExists($fullPath);

            return response()->json([
                'message' => 'Folder berhasil dibuat.',
                'folder' => [
                    'name' => $folderName,
                    'path' => $fullPath,
                    'is_dir' => true,
                ]
            ]);
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            return $e->getResponse();
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function shareUpload(Request $request, $token)
    {
        $request->validate([
            'file' => 'required|file|max:256000',
            'path' => 'nullable|string',
        ]);

        try {
            $basePath = $this->getPublicShareWithWritePermission($token);

            $subPath = $request->input('path', '');
            $subPath = str_replace('..', '', $subPath);
            $subPath = ltrim($subPath, '/');

            $targetPath = $basePath;
            if (!empty($subPath)) {
                $targetPath .= '/' . $subPath;
            }

            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $safeName = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $originalName);
            $fullPath = '/' . ltrim($targetPath . '/' . $safeName, '/');

            // Security check
            if (!str_starts_with($fullPath, $basePath)) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            $this->ensureDirectoryExists(dirname($fullPath));

            $url = $this->getWebdavUrl($fullPath);
            $fileContents = file_get_contents($file->getRealPath());

            $uploadResponse = $this->httpClient()
                ->withHeaders([
                    'X-Requested-With' => 'XMLHttpRequest',
                    'Content-Type' => $file->getClientMimeType()
                ])
                ->withBody($fileContents, $file->getClientMimeType())
                ->put($url);

            if (!$uploadResponse->successful()) {
                return response()->json(['message' => 'Gagal mengunggah berkas ke Nextcloud.'], 500);
            }

            return response()->json([
                'message' => 'Berkas berhasil diunggah.',
                'file' => [
                    'name' => $safeName,
                    'path' => $fullPath,
                    'size' => $file->getSize(),
                    'is_dir' => false,
                    'last_modified' => date('Y-m-d H:i:s'),
                ]
            ]);
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            return $e->getResponse();
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function shareDelete(Request $request, $token)
    {
        $request->validate([
            'path' => 'required|string',
        ]);

        try {
            $basePath = $this->getPublicShareWithWritePermission($token);

            $path = $request->query('path');
            $subPath = str_replace('..', '', $path);
            $subPath = ltrim($subPath, '/');

            $fullPath = '/' . ltrim($basePath . '/' . $subPath, '/');

            // Security check: Must not delete the root of shared folder
            if ($fullPath === $basePath) {
                return response()->json(['message' => 'Tidak dapat menghapus folder utama.'], 403);
            }
            if (!str_starts_with($fullPath, $basePath)) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            $url = $this->getWebdavUrl($fullPath);
            $response = $this->httpClient()
                ->withHeaders(['X-Requested-With' => 'XMLHttpRequest'])
                ->delete($url);

            if (!$response->successful()) {
                return response()->json(['message' => 'Gagal menghapus berkas di Nextcloud.'], 500);
            }

            return response()->json(['message' => 'Berkas berhasil dihapus.']);
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            return $e->getResponse();
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function shareMove(Request $request, $token)
    {
        $request->validate([
            'source_path' => 'required|string',
            'dest_path' => 'required|string',
        ]);

        try {
            $basePath = $this->getPublicShareWithWritePermission($token);

            $sourceSub = str_replace('..', '', $request->input('source_path'));
            $sourceSub = ltrim($sourceSub, '/');
            $destSub = str_replace('..', '', $request->input('dest_path'));
            $destSub = ltrim($destSub, '/');

            $sourcePath = '/' . ltrim($basePath . '/' . $sourceSub, '/');
            $destPath = '/' . ltrim($basePath . '/' . $destSub, '/');

            // Security check: Both paths must start with base shared folder
            if (!str_starts_with($sourcePath, $basePath) || !str_starts_with($destPath, $basePath)) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            $this->ensureDirectoryExists(dirname($destPath));
            $response = $this->webdavMoveOrCopy($sourcePath, $destPath, 'MOVE');

            if ($response->status() === 412) {
                return response()->json(['message' => 'Berkas tujuan sudah ada.'], 412);
            }

            if (!$response->successful() && $response->status() !== 201 && $response->status() !== 204) {
                return response()->json(['message' => 'Gagal memindahkan berkas.'], 500);
            }

            return response()->json(['message' => 'Item berhasil dipindahkan.']);
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            return $e->getResponse();
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function shareCopy(Request $request, $token)
    {
        $request->validate([
            'source_path' => 'required|string',
            'dest_path' => 'required|string',
        ]);

        try {
            $basePath = $this->getPublicShareWithWritePermission($token);

            $sourceSub = str_replace('..', '', $request->input('source_path'));
            $sourceSub = ltrim($sourceSub, '/');
            $destSub = str_replace('..', '', $request->input('dest_path'));
            $destSub = ltrim($destSub, '/');

            $sourcePath = '/' . ltrim($basePath . '/' . $sourceSub, '/');
            $destPath = '/' . ltrim($basePath . '/' . $destSub, '/');

            // Security check: Both paths must start with base shared folder
            if (!str_starts_with($sourcePath, $basePath) || !str_starts_with($destPath, $basePath)) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            $this->ensureDirectoryExists(dirname($destPath));
            $response = $this->webdavMoveOrCopy($sourcePath, $destPath, 'COPY');

            if ($response->status() === 412) {
                return response()->json(['message' => 'Berkas tujuan sudah ada.'], 412);
            }

            if (!$response->successful() && $response->status() !== 201 && $response->status() !== 204) {
                return response()->json(['message' => 'Gagal menyalin berkas.'], 500);
            }

            return response()->json(['message' => 'Item berhasil disalin.']);
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            return $e->getResponse();
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
