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
        $parts = explode('/', $cleanPath);
        $encodedParts = array_map(function ($part) {
            return rawurlencode(rawurldecode($part));
        }, $parts);
        return "{$this->baseUrl}/remote.php/dav/files/{$this->username}" . implode('/', $encodedParts);
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

            // Get directory listing with explicit oc:size request
            $url = $this->getWebdavUrl($targetDir);
            $propfindXml = '<?xml version="1.0" encoding="utf-8" ?>'
                . '<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">'
                . '<d:prop><d:getlastmodified/><d:getcontentlength/><d:getcontenttype/><d:resourcetype/><oc:size/></d:prop>'
                . '</d:propfind>';

            $response = $this->httpClient()
                ->withHeaders([
                    'X-Requested-With' => 'XMLHttpRequest',
                    'Content-Type' => 'application/xml',
                    'Depth' => '1' // Get immediate children
                ])
                ->withBody($propfindXml, 'application/xml')
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
                $xpath->registerNamespace('oc', 'http://owncloud.org/ns');
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
                        $ocSizeNodes = $xpath->query('*[local-name()="size"]', $prop);

                        $size = 0;
                        if ($sizeNodes->length > 0 && is_numeric($sizeNodes->item(0)->textContent)) {
                            $size = (int)$sizeNodes->item(0)->textContent;
                        }
                        if ($size <= 0 && $ocSizeNodes->length > 0 && is_numeric($ocSizeNodes->item(0)->textContent)) {
                            $size = (int)$ocSizeNodes->item(0)->textContent;
                        }
                        
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
                            'size' => (int)$size,
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

        // 🛡️ Security Check 2: Strictly enforce user's own NIP folder for ALL users (including admin)
        $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip;
        if ($cleanPath !== $expectedPrefix && !str_starts_with($cleanPath, $expectedPrefix . '/')) {
            return response()->json(['message' => 'Anda hanya dapat mengunduh berkas SIPTU Drive milik sendiri.'], 403);
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
            $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            $contentType = $response->header('Content-Type');

            $mimeMap = [
                'png' => 'image/png',
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'webp' => 'image/webp',
                'gif' => 'image/gif',
                'svg' => 'image/svg+xml',
                'bmp' => 'image/bmp',
                'pdf' => 'application/pdf',
            ];
            if (isset($mimeMap[$ext])) {
                $contentType = $mimeMap[$ext];
            } else if (!$contentType || $contentType === 'application/octet-stream') {
                $contentType = 'application/octet-stream';
            }

            $disposition = $request->query('inline') === '1' ? 'inline' : 'attachment';

            $res = response($response->body())
                ->header('Content-Type', $contentType)
                ->header('Content-Disposition', $disposition . '; filename="' . rawurlencode($filename) . '"');
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

        // 🛡️ Security Check 2: Strictly enforce user's own NIP folder for ALL users (including admin)
        $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip;
        if ($cleanPath !== $expectedPrefix && !str_starts_with($cleanPath, $expectedPrefix . '/')) {
            return response()->json(['message' => 'Anda hanya dapat menghapus berkas SIPTU Drive milik sendiri.'], 403);
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

        // Security Check: Strictly enforce user's own NIP folder for ALL users (including admin)
        $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip;
        if ($cleanPath !== $expectedPrefix && !str_starts_with($cleanPath, $expectedPrefix . '/')) {
            return response()->json(['message' => 'Anda hanya dapat membagikan berkas SIPTU Drive milik sendiri.'], 403);
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
            $token = str_replace(' ', '+', $token);
            $cleanBasePath = null;
            $share = NextcloudShare::where('token', $token)->first();

            if ($share) {
                $cleanBasePath = '/' . ltrim($share->path, '/');
            } else {
                try {
                    $basePath = \Illuminate\Support\Facades\Crypt::decryptString(base64_decode($token));
                    $cleanBasePath = '/' . ltrim($basePath, '/');
                } catch (\Exception $e) {
                    return response()->json(['message' => 'Tautan berbagi tidak valid atau telah kedaluwarsa.'], 404);
                }
            }
            
            if (!$cleanBasePath || !str_starts_with($cleanBasePath, '/SIPTU Drive/')) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            $canEdit = $share ? (bool)$share->can_edit : false;

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
    public function shareDownload(Request $request, $token, $filename = null)
    {
        try {
            $token = str_replace(' ', '+', $token);
            $cleanBasePath = null;

            $share = NextcloudShare::where('token', $token)->first();
            if ($share) {
                $cleanBasePath = '/' . ltrim($share->path, '/');
            } else {
                try {
                    $basePath = \Illuminate\Support\Facades\Crypt::decryptString(base64_decode($token));
                    $cleanBasePath = '/' . ltrim($basePath, '/');
                } catch (\Exception $e) {
                    return response()->json(['message' => 'Tautan tidak valid atau telah kedaluwarsa.'], 400);
                }
            }

            if (!$cleanBasePath || !str_starts_with($cleanBasePath, '/SIPTU Drive/')) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            // Support downloading file inside a shared folder or direct path
            $rawQueryPath = $request->query('path', '');
            if (!empty($rawQueryPath)) {
                $subPath = str_replace('..', '', $rawQueryPath);
                $subPath = '/' . ltrim($subPath, '/');

                if (str_starts_with($subPath, $cleanBasePath)) {
                    $cleanTargetPath = $subPath;
                } else if (str_starts_with($subPath, '/SIPTU Drive/')) {
                    $cleanTargetPath = $subPath;
                } else {
                    $cleanTargetPath = rtrim($cleanBasePath, '/') . '/' . ltrim($subPath, '/');
                }
            } else {
                $cleanTargetPath = $cleanBasePath;
            }

            // Security Check: Target path must remain within base shared directory or SIPTU Drive
            if (!str_starts_with($cleanTargetPath, '/SIPTU Drive/')) {
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
            $fileName = $filename ?: basename($cleanTargetPath);
            $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            $contentType = $response->header('Content-Type');

            $mimeMap = [
                'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'xls' => 'application/vnd.ms-excel',
                'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'doc' => 'application/msword',
                'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'ppt' => 'application/vnd.ms-powerpoint',
                'pdf' => 'application/pdf',
                'png' => 'image/png',
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'gif' => 'image/gif',
                'svg' => 'image/svg+xml',
                'txt' => 'text/plain',
                'csv' => 'text/csv',
            ];

            if (isset($mimeMap[$ext])) {
                $contentType = $mimeMap[$ext];
            } else if (!$contentType || $contentType === 'application/octet-stream') {
                $contentType = 'application/octet-stream';
            }

            $disposition = $request->query('inline') === '1' ? 'inline' : 'attachment';

            $headers = [
                'Content-Type' => $contentType,
                'Content-Disposition' => $disposition . '; filename="' . rawurlencode($fileName) . '"',
                'Access-Control-Allow-Origin' => '*',
                'Accept-Ranges' => 'bytes',
                'Cache-Control' => 'public, max-age=3600',
            ];
            if ($contentLength) {
                $headers['Content-Length'] = $contentLength;
            }

            if ($request->isMethod('HEAD')) {
                return response('', 200, $headers);
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

        // 🛡️ Security Check: Strictly enforce user's own NIP folder for ALL users (including admin)
        $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip;
        if ($cleanPath !== $expectedPrefix && !str_starts_with($cleanPath, $expectedPrefix . '/')) {
            return response()->json(['message' => 'Anda hanya dapat menyimpan berkas di SIPTU Drive milik sendiri.'], 403);
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

        // Security check for ALL users (including admin)
        if (!str_starts_with($path, '/SIPTU Drive/')) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }
        $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip;
        if ($path !== $expectedPrefix && !str_starts_with($path, $expectedPrefix . '/')) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
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

        // Security check for ALL users (including admin)
        if (!str_starts_with($path, '/SIPTU Drive/')) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }
        $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip;
        if ($path !== $expectedPrefix && !str_starts_with($path, $expectedPrefix . '/')) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $share = NextcloudShare::where('path', $path)->first();

        if ($share) {
            $share->update(['can_edit' => $canEdit]);
        } else {
            // Generate clean URL-safe 32-char hex token
            $token = bin2hex(random_bytes(16));
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

        // Security check for ALL users (including admin)
        if (!str_starts_with($path, '/SIPTU Drive/')) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }
        $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip;
        if ($path !== $expectedPrefix && !str_starts_with($path, $expectedPrefix . '/')) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
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

        // Security Check 2: Strictly enforce user's own NIP folder for ALL users (including admin)
        $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip;
        if (
            ($source !== $expectedPrefix && !str_starts_with($source, $expectedPrefix . '/')) ||
            ($dest !== $expectedPrefix && !str_starts_with($dest, $expectedPrefix . '/'))
        ) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
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

        // Security Check 2: Strictly enforce user's own NIP folder for ALL users (including admin)
        $expectedPrefix = '/SIPTU Drive/' . $currentUser->nip;
        if (
            ($source !== $expectedPrefix && !str_starts_with($source, $expectedPrefix . '/')) ||
            ($dest !== $expectedPrefix && !str_starts_with($dest, $expectedPrefix . '/'))
        ) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
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
     * Search files recursively starting from the currently open folder path.
     */
    public function search(Request $request)
    {
        $currentUser = $request->user();
        $targetNip = $currentUser->nip;

        if (empty($targetNip)) {
            return response()->json(['message' => 'NIP pegawai tidak ditemukan.'], 400);
        }

        $query = strtolower(trim($request->query('query', '')));
        $subPath = $request->query('path', '');
        
        $baseDir = "SIPTU Drive/{$targetNip}";
        if ($subPath) {
            $subPath = str_replace('..', '', $subPath);
            $subPath = ltrim($subPath, '/');
            $targetDir = $baseDir . '/' . $subPath;
        } else {
            $targetDir = $baseDir;
        }

        if (empty($query)) {
            return response()->json(['files' => []]);
        }

        try {
            $this->ensureDirectoryExists($targetDir);

            $url = $this->getWebdavUrl($targetDir);
            $response = $this->httpClient()
                ->withHeaders([
                    'X-Requested-With' => 'XMLHttpRequest',
                    'Depth' => 'infinity'
                ])
                ->send('PROPFIND', $url);

            if (!$response->successful()) {
                return response()->json(['files' => []]);
            }

            $xmlStr = $response->body();
            $files = [];

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
                    
                    $prefix = "/remote.php/dav/files/{$this->username}";
                    $relativePath = str_replace($prefix, '', $decodedHref);
                    $cleanRelative = '/' . ltrim($relativePath, '/');

                    // Skip the requested root search folder itself
                    if (rtrim($cleanRelative, '/') === rtrim($cleanTargetDir, '/')) {
                        continue;
                    }

                    $name = basename(rtrim($relativePath, '/'));

                    // Check if file/folder name matches query
                    if (stripos($name, $query) === false) {
                        continue;
                    }

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
                        $isDir = $collectionNodes->length > 0;

                        $isShared = isset($sharedPaths[$cleanRelative]);

                        // Calculate path relative to open folder
                        $relToFolder = str_replace($cleanTargetDir, '', $cleanRelative);
                        $displaySubPath = ltrim($relToFolder, '/');

                        $files[] = [
                            'name' => $name,
                            'path' => $cleanRelative,
                            'display_path' => $displaySubPath,
                            'size' => $isDir ? null : $size,
                            'is_dir' => $isDir,
                            'is_shared' => $isShared,
                            'last_modified' => $lastModified,
                            'content_type' => $contentType,
                        ];
                    }
                }
            }

            return response()->json(['files' => $files]);

        } catch (\Exception $e) {
            Log::error("Nextcloud search error: " . $e->getMessage());
            return response()->json(['files' => []], 500);
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

    /**
     * Prepare a static file URL for Microsoft Office Online viewing.
     * Downloads file from Nextcloud and caches it in public/dokumen-nextcloud/.
     * Returns the direct static URL that Office Online can access.
     */
    public function officePreview(Request $request)
    {
        try {
            $rawToken = $request->input('token');
            $path = $request->input('path', '');

            if (!$rawToken) {
                return response()->json(['message' => 'Token diperlukan.'], 400);
            }

            // Decode URL variations (e.g. %3D == or spaces vs +)
            $token = urldecode(str_replace(' ', '+', $rawToken));
            $cleanBasePath = null;

            $share = NextcloudShare::where('token', $token)->orWhere('token', $rawToken)->first();
            if ($share) {
                $cleanBasePath = '/' . ltrim($share->path, '/');
            } else {
                try {
                    $basePath = \Illuminate\Support\Facades\Crypt::decryptString(base64_decode($token));
                    $cleanBasePath = '/' . ltrim($basePath, '/');
                } catch (\Exception $e) {
                    try {
                        $basePath = \Illuminate\Support\Facades\Crypt::decryptString(base64_decode(urldecode($rawToken)));
                        $cleanBasePath = '/' . ltrim($basePath, '/');
                    } catch (\Exception $e2) {
                        return response()->json(['message' => 'Tautan tidak valid atau telah kedaluwarsa.'], 400);
                    }
                }
            }

            if (!$cleanBasePath || !str_starts_with($cleanBasePath, '/SIPTU Drive/')) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            // Resolve target path safely (Single file vs Directory share)
            $baseExt = strtolower(pathinfo($cleanBasePath, PATHINFO_EXTENSION));
            if (!empty($baseExt)) {
                // $cleanBasePath is already a direct single file path
                $cleanTargetPath = $cleanBasePath;
            } else {
                // $cleanBasePath is a directory (folder share)
                if (!empty($path)) {
                    $subPath = str_replace('..', '', $path);
                    $subPath = '/' . ltrim($subPath, '/');

                    if (str_starts_with($subPath, $cleanBasePath)) {
                        $cleanTargetPath = $subPath;
                    } else if (str_starts_with($subPath, '/SIPTU Drive/')) {
                        $cleanTargetPath = $subPath;
                    } else {
                        $cleanTargetPath = rtrim($cleanBasePath, '/') . '/' . ltrim($subPath, '/');
                    }
                } else {
                    $cleanTargetPath = $cleanBasePath;
                }
            }

            if (!str_starts_with($cleanTargetPath, '/SIPTU Drive/')) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            // Generate unique deterministic filename based on target path hash + original filename
            $originalName = basename($cleanTargetPath);
            $hash = substr(md5($cleanTargetPath), 0, 16);
            $safeFilename = $hash . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $originalName);

            $cacheDir = public_path('dokumen-nextcloud');
            $cachePath = $cacheDir . DIRECTORY_SEPARATOR . $safeFilename;

            // Clean up old cached files (older than 4 hours = 14400 seconds)
            $this->cleanupOldPreviewFiles($cacheDir, 14400);

            // Check if file already exists in cache to avoid double download
            if (file_exists($cachePath) && filesize($cachePath) > 0) {
                // Update file modification time so it remains fresh
                @touch($cachePath);
            } else {
                // Download from Nextcloud only if not already cached
                $url = $this->getWebdavUrl($cleanTargetPath);
                $response = $this->httpClient()
                    ->withHeaders(['X-Requested-With' => 'XMLHttpRequest'])
                    ->timeout(60)
                    ->send('GET', $url);

                if (!$response->successful()) {
                    return response()->json(['message' => 'Gagal mengunduh berkas dari Nextcloud.'], 404);
                }

                // Save to public directory
                file_put_contents($cachePath, $response->body());
            }

            // Build the public static URL
            // APP_URL includes /core_api, and dokumen-nextcloud is in Laravel's public/ dir
            $appUrl = rtrim(config('app.url', 'https://siptu.bpompalopo.com/core_api'), '/');
            $publicUrl = $appUrl . '/dokumen-nextcloud/' . $safeFilename;

            return response()->json([
                'url' => $publicUrl,
                'filename' => $originalName,
            ]);
        } catch (\Exception $e) {
            Log::error('Office preview error: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal mempersiapkan pratinjau. ' . $e->getMessage()], 500);
        }
    }

    /**
     * Remove preview files older than the specified max age (in seconds, default 4 hours = 14400).
     */
    private function cleanupOldPreviewFiles($directory, $maxAge = 14400)
    {
        if (!is_dir($directory)) return;

        $now = time();
        $files = glob($directory . DIRECTORY_SEPARATOR . '*');
        foreach ($files as $file) {
            // Keep .gitignore and .htaccess safe
            $filename = basename($file);
            if ($filename === '.gitignore' || $filename === '.htaccess') {
                continue;
            }

            if (is_file($file) && ($now - filemtime($file)) > $maxAge) {
                @unlink($file);
            }
        }
    }
}
