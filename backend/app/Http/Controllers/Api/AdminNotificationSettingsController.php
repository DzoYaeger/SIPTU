<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminNotificationSettingsController extends Controller
{
    public function index()
    {
        $setting = NotificationSetting::first();
        $rawHeroSlider = $setting?->getAttribute('hero_slider');

        return response()->json([
            'fonnte' => [
                'token' => '',
                'has_token' => filled($setting?->fonnte_token),
                'endpoint' => $setting?->fonnte_endpoint ?? 'https://api.fonnte.com/send',
                'default_admin_numbers' => $setting?->default_admin_numbers ?? [],
            ],
            'recipients' => $setting?->recipients ?? [],
            'kgb_window' => $setting?->kgb_window ?? [
                'start' => null,
                'end' => null,
            ],
            'surat_tugas_templates' => $setting?->surat_tugas_templates ?? [],
            'kepala_balai_settings' => $setting?->kepala_balai_settings ?? [
                'id' => null,
                'status' => 'tetap',
            ],
            'hero_slider' => $setting?->hero_slider ?? [],
            'hero_slider_initialized' => $rawHeroSlider !== null,
        ]);
    }

    public function update(Request $request)
    {
        $payload = $request->validate([
            'fonnte' => ['nullable', 'array'],
            'fonnte.token' => ['nullable', 'string'],
            'fonnte.endpoint' => ['nullable', 'string'],
            'fonnte.default_admin_numbers' => ['nullable', 'array'],
            'fonnte.default_admin_numbers.*' => ['string'],
            'recipients' => ['nullable', 'array'],
            'recipients.*' => ['array'],
            'recipients.*.*' => ['string'],
            'kgb_window' => ['nullable', 'array'],
            'kgb_window.start' => ['nullable', 'string'],
            'kgb_window.end' => ['nullable', 'string'],
            'surat_tugas_templates' => ['nullable', 'array'],
            'surat_tugas_templates.*' => ['string'],
            'hero_slider' => ['nullable', 'array'],
            'hero_slider.*.title' => ['nullable', 'string', 'max:120'],
            'hero_slider.*.description' => ['nullable', 'string', 'max:240'],
            'hero_slider.*.image' => ['nullable', 'string', 'max:500'],
            'hero_slider.*.tone' => ['nullable', 'string', 'max:32'],
            'hero_slider.*.active' => ['nullable', 'boolean'],
            'kepala_balai_settings' => ['nullable', 'array'],
            'kepala_balai_settings.id' => ['nullable', 'integer'],
            'kepala_balai_settings.status' => ['nullable', 'string', 'in:tetap,plh'],
        ]);

        $defaultNumbers = $this->normalizeNumbers(data_get($payload, 'fonnte.default_admin_numbers', []));
        $recipients = $this->normalizeRecipientNumbers(data_get($payload, 'recipients', []));

        $setting = NotificationSetting::first();
        if (!$setting) {
            $setting = NotificationSetting::create([
                'fonnte_token' => null,
                'fonnte_endpoint' => 'https://api.fonnte.com/send',
                'default_admin_numbers' => [],
                'recipients' => [],
                'kgb_window' => [],
                'surat_tugas_templates' => [],
                'hero_slider' => [],
            ]);
        }

        $currentToken = $setting->fonnte_token;
        $hasIncomingToken = data_has($payload, 'fonnte.token');
        $incomingToken = $hasIncomingToken ? trim((string) data_get($payload, 'fonnte.token', '')) : null;

        if ($incomingToken !== null && $incomingToken !== '' && $request->user()?->password && Hash::check($incomingToken, $request->user()->password)) {
            return response()->json([
                'message' => 'Token Fonnte tidak disimpan karena terdeteksi sama dengan password akun login. Matikan autofill browser pada kolom token lalu masukkan token Fonnte yang benar.',
                'errors' => [
                    'fonnte.token' => ['Token Fonnte tidak boleh sama dengan password akun login.'],
                ],
            ], 422);
        }

        $heroSlides = array_values(array_filter(
            data_get($payload, 'hero_slider', []),
            fn ($slide) => is_array($slide)
        ));

        $setting->update([
            'fonnte_token' => $hasIncomingToken
                ? ($incomingToken !== '' ? $incomingToken : $currentToken)
                : $currentToken,
            'fonnte_endpoint' => data_get($payload, 'fonnte.endpoint') ?: 'https://api.fonnte.com/send',
            'default_admin_numbers' => $defaultNumbers,
            'recipients' => $recipients,
            'kgb_window' => data_get($payload, 'kgb_window', []),
            'surat_tugas_templates' => array_values(array_unique(array_filter(
                data_get($payload, 'surat_tugas_templates', []),
                fn ($value) => is_string($value) && trim($value) !== ''
            ))),
            'hero_slider' => $heroSlides,
            'kepala_balai_settings' => data_get($payload, 'kepala_balai_settings'),
        ]);

        return response()->json([
            'fonnte' => [
                'token' => '',
                'has_token' => filled($setting->fonnte_token),
                'endpoint' => $setting->fonnte_endpoint ?? 'https://api.fonnte.com/send',
                'default_admin_numbers' => $setting->default_admin_numbers ?? [],
            ],
            'recipients' => $setting->recipients ?? [],
            'kgb_window' => $setting->kgb_window ?? [
                'start' => null,
                'end' => null,
            ],
            'surat_tugas_templates' => $setting->surat_tugas_templates ?? [],
            'kepala_balai_settings' => $setting->kepala_balai_settings ?? [],
            'hero_slider' => $setting->hero_slider ?? [],
            'hero_slider_initialized' => true,
        ]);
    }

    public function heroSlider()
    {
        $setting = NotificationSetting::first();
        if (!$setting) {
            return response()->json([
                'slides' => [],
                'use_default' => true,
                'popup' => null,
                'slider_duration' => 6,
            ]);
        }
        $slides = $setting?->hero_slider ?? [];
        if (!is_array($slides)) {
            $slides = [];
        }
        $normalized = $this->normalizeHeroSlides($slides, true);

        // Popup config — only return if active
        $popup = $setting->popup_config;
        if (!is_array($popup) || empty($popup['active'])) {
            $popup = null;
        } else {
            // Normalize popup image
            if (!empty($popup['image'])) {
                $popup['image'] = $this->normalizeHeroImagePath($popup['image']);
            }
        }

        return response()->json([
            'slides' => $normalized,
            'use_default' => false,
            'popup' => $popup,
            'slider_duration' => $setting->slider_duration ?: 6,
        ]);
    }

    public function heroSliderConfig(Request $request)
    {
        $user = $request->user();
        if (!$this->canManageHeroSlider($user)) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $setting = NotificationSetting::first();
        $rawHeroSlider = $setting?->getAttribute('hero_slider');
        $slides = $setting?->hero_slider ?? [];
        if (!is_array($slides)) {
            $slides = [];
        }
        $normalized = $this->normalizeHeroSlides($slides, false);

        // Popup config for editor (return even if inactive)
        $popup = $setting?->popup_config;
        if (!is_array($popup)) {
            $popup = [
                'title' => '',
                'content' => '',
                'image' => '',
                'link' => '',
                'active' => false,
                'show_once' => true,
                'use_duration' => false,
                'duration' => 5,
            ];
        }

        return response()->json([
            'hero_slider' => $normalized,
            'hero_slider_initialized' => $rawHeroSlider !== null,
            'popup' => $popup,
            'slider_duration' => $setting?->slider_duration ?: 6,
        ]);
    }

    public function updateHeroSlider(Request $request)
    {
        $user = $request->user();
        if (!$this->canManageHeroSlider($user)) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $payload = $request->validate([
            'hero_slider' => ['nullable', 'array'],
            'hero_slider.*.title' => ['nullable', 'string', 'max:120'],
            'hero_slider.*.description' => ['nullable', 'string', 'max:240'],
            'hero_slider.*.image' => ['nullable', 'string', 'max:500'],
            'hero_slider.*.tone' => ['nullable', 'string', 'max:32'],
            'hero_slider.*.active' => ['nullable', 'boolean'],
            'popup' => ['nullable', 'array'],
            'popup.title' => ['nullable', 'string', 'max:120'],
            'popup.content' => ['nullable', 'string', 'max:2000'],
            'popup.image' => ['nullable', 'string', 'max:500'],
            'popup.link' => ['nullable', 'string', 'max:500'],
            'popup.active' => ['nullable', 'boolean'],
            'popup.show_once' => ['nullable', 'boolean'],
            'popup.use_duration' => ['nullable', 'boolean'],
            'popup.duration' => ['nullable', 'integer', 'min:1', 'max:300'],
            'slider_duration' => ['nullable', 'integer', 'min:2', 'max:60'],
        ]);

        $setting = NotificationSetting::first();
        if (!$setting) {
            $setting = NotificationSetting::create([
                'fonnte_token' => null,
                'fonnte_endpoint' => 'https://api.fonnte.com/send',
                'default_admin_numbers' => [],
                'recipients' => [],
                'kgb_window' => [],
                'surat_tugas_templates' => [],
                'hero_slider' => [],
                'popup_config' => [],
                'slider_duration' => 6,
            ]);
        }

        $heroSlides = array_values(array_filter(
            data_get($payload, 'hero_slider', []),
            fn ($slide) => is_array($slide)
        ));

        $heroSlides = $this->normalizeHeroSlides($heroSlides, false);

        // Popup config
        $popupInput = data_get($payload, 'popup');
        $popupConfig = null;
        if (is_array($popupInput)) {
            $popupConfig = [
                'title' => trim($popupInput['title'] ?? ''),
                'content' => trim($popupInput['content'] ?? ''),
                'image' => $this->normalizeHeroImagePath(trim($popupInput['image'] ?? '')),
                'link' => trim($popupInput['link'] ?? ''),
                'active' => (bool) ($popupInput['active'] ?? false),
                'show_once' => (bool) ($popupInput['show_once'] ?? true),
                'use_duration' => (bool) ($popupInput['use_duration'] ?? false),
                'duration' => (int) ($popupInput['duration'] ?? 5),
            ];
        }

        $updateData = [
            'hero_slider' => $heroSlides,
        ];

        if ($popupConfig !== null) {
            $updateData['popup_config'] = $popupConfig;
        }

        if (isset($payload['slider_duration'])) {
            $updateData['slider_duration'] = (int) $payload['slider_duration'];
        }

        $setting->update($updateData);

        return response()->json([
            'hero_slider' => $setting->hero_slider ?? [],
            'hero_slider_initialized' => true,
            'popup' => $setting->popup_config ?? [],
            'slider_duration' => $setting->slider_duration ?: 6,
        ]);
    }

    public function uploadHeroSliderImage(Request $request)
    {
        if (!auth()->check()) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        try {
            $request->validate([
                'file' => ['required', 'file', 'max:2048'],
            ]);

            $file = $request->file('file');
            if (!$file) {
                return response()->json(['message' => 'File tidak ditemukan.'], 422);
            }

            // Validasi mime type manual
            $allowedMimes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'];
            if (!in_array($file->getMimeType(), $allowedMimes)) {
                return response()->json([
                    'message' => 'Format file tidak didukung. Gunakan: SVG, PNG, JPG, WEBP',
                    'mime_type' => $file->getMimeType(),
                    'extension' => $file->getClientOriginalExtension()
                ], 422);
            }

            $extension = strtolower($file->getClientOriginalExtension() ?: 'png');
            // Fix extension for jpeg
            if ($extension === 'jpeg') {
                $extension = 'jpg';
            }
            $filename = 'hero-' . Str::random(12) . '.' . $extension;

            // Simpan ke core_api/public/storage/hero-slider/
            $publicDir = public_path('storage/hero-slider');
            if (!File::exists($publicDir)) {
                File::makeDirectory($publicDir, 0755, true);
            }

            $file->move($publicDir, $filename);

            // URL path
            $path = 'storage/hero-slider/' . $filename;

            // Copy file ke public_html/storage/hero-slider/ agar bisa diakses dari frontend
            // Struktur hosting:
            //   /domain/siptu.bpompalopo.com/core_api/      ← base_path()
            //   /domain/siptu.bpompalopo.com/public_html/    ← frontend root
            // dirname(base_path()) = /domain/siptu.bpompalopo.com/
            $copiedToRoot = false;
            try {
                $rootStorageDir = dirname(base_path()) . '/public_html/storage/hero-slider';
                if (!File::exists($rootStorageDir)) {
                    File::makeDirectory($rootStorageDir, 0755, true);
                }
                $sourceFile = $publicDir . '/' . $filename;
                $targetFile = $rootStorageDir . '/' . $filename;
                if (File::exists($sourceFile)) {
                    File::copy($sourceFile, $targetFile);
                    $copiedToRoot = true;
                }
            } catch (\Exception $copyEx) {
                $copiedToRoot = false;
            }

            // URL lengkap (root domain)
            $rootUrl = str_replace('/core_api', '', config('app.url', 'https://siptu.bpompalopo.com'));

            if ($copiedToRoot) {
                $fullUrl = rtrim($rootUrl, '/') . '/' . $path;
            } else {
                // Fallback: serve langsung dari core_api public storage (via symlink)
                $fullUrl = rtrim($rootUrl, '/') . '/core_api/' . $path;
            }

            return response()->json([
                'url' => $fullUrl,
                'path' => $path,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Terjadi kesalahan saat upload',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function canManageHeroSlider($user): bool
    {
        return $user && ($user->base_role ?? null) === 'admin';
    }

    private function normalizeHeroSlides(array $slides, bool $onlyActive): array
    {
        $allowedTones = ['blue', 'teal', 'orange', 'purple', 'green', 'slate'];
        $normalized = array_map(function ($slide) use ($allowedTones) {
            $title = is_string($slide['title'] ?? null) ? trim($slide['title']) : '';
            $description = is_string($slide['description'] ?? null) ? trim($slide['description']) : '';
            $image = is_string($slide['image'] ?? null) ? trim($slide['image']) : '';
            $tone = is_string($slide['tone'] ?? null) ? trim($slide['tone']) : 'blue';
            $active = isset($slide['active']) ? (bool) $slide['active'] : true;

            $image = $this->normalizeHeroImagePath($image);

            return [
                'title' => $title,
                'description' => $description,
                'image' => $image,
                'tone' => in_array($tone, $allowedTones, true) ? $tone : 'blue',
                'active' => $active,
            ];
        }, array_filter($slides, 'is_array'));

        if ($onlyActive) {
            $normalized = array_values(array_filter($normalized, function ($slide) {
                if (!$slide['active']) return false;
                return $slide['image'] !== '';
            }));
        }

        return $normalized;
    }

    private function normalizeHeroImagePath(string $image): string
    {
        if ($image === '') return $image;

        if (str_contains($image, '/api/hero-slider/')) {
            $image = str_replace('/api/hero-slider/', '/storage/hero-slider/', $image);
        }

        if (str_starts_with($image, '/api/')) {
            $image = '/' . substr($image, 5);
        } elseif (str_starts_with($image, 'api/')) {
            $image = '/' . substr($image, 4);
        }

        if (str_starts_with($image, 'storage/hero-slider/')) {
            $image = '/' . $image;
        } elseif (str_starts_with($image, 'hero-slider/')) {
            $image = '/storage/' . $image;
        }

        if ($image === '/hero-slider' || $image === '/hero-slider/') {
            return '';
        }

        return $image;
    }

    private function normalizeRecipientNumbers(array $recipients): array
    {
        $normalized = [];
        foreach ($recipients as $module => $numbers) {
            $normalized[$module] = $this->normalizeNumbers(is_array($numbers) ? $numbers : []);
        }
        return $normalized;
    }

    private function normalizeNumbers(array $numbers): array
    {
        $result = [];
        foreach ($numbers as $number) {
            if (!is_string($number)) {
                continue;
            }

            $number = trim($number);
            if ($number === '') {
                continue;
            }

            if (preg_match('/[a-zA-Z@]/', $number)) {
                $result[] = $number;
                continue;
            }

            $clean = preg_replace('/[^0-9+]/', '', $number);
            if ($clean === '' || $clean === null) {
                continue;
            }
            if (str_starts_with($clean, '0')) {
                $clean = '+62' . substr($clean, 1);
            } elseif (str_starts_with($clean, '62')) {
                $clean = '+' . $clean;
            }
            if (!str_starts_with($clean, '+')) {
                $clean = '+' . $clean;
            }
            $result[] = $clean;
        }
        return array_values(array_unique($result));
    }
}
