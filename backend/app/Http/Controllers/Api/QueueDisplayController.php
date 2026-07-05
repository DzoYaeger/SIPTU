<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QueueDisplay;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class QueueDisplayController extends Controller
{
    /**
     * Public endpoint for TV display — returns ALL counters' state.
     * No authentication required.
     */
    public function publicShow()
    {
        $counters = QueueDisplay::orderBy('counter_code')->get();

        if ($counters->isEmpty()) {
            return response()->json([
                'counters' => [],
                'ticker_text' => null,
                'slideshow' => [],
            ]);
        }

        $result = [];
        $tickerText = null;
        $slideshow = [];

        foreach ($counters as $queue) {
            $photo = $queue->employee_photo;
            if ($photo && !str_starts_with($photo, 'http')) {
                $photo = '/' . ltrim($photo, '/');
            }

            $result[] = [
                'counter_code' => $queue->counter_code,
                'current_number' => $queue->current_number,
                'employee_name' => $queue->employee_name,
                'employee_photo' => $photo,
                'counter_name' => $queue->counter_name ?: 'ULPK',
                'status' => $queue->status,
                'updated_at' => $queue->updated_at?->toISOString(),
                'last_called_at' => $queue->last_called_at?->toISOString(),
            ];

            // Use ticker & slideshow from counter A (or first one that has data)
            if ($queue->ticker_text && !$tickerText) {
                $tickerText = $queue->ticker_text;
            }

            if (!empty($queue->slideshow) && empty($slideshow)) {
                $slideshow = array_values(array_filter(array_map(function ($slide) {
                    if (!is_array($slide)) return null;
                    $image = $slide['image'] ?? '';
                    if ($image && !str_starts_with($image, 'http')) {
                        $image = '/' . ltrim($image, '/');
                    }
                    return [
                        'image' => $image,
                        'title' => $slide['title'] ?? '',
                        'duration' => (int) ($slide['duration'] ?? 8),
                    ];
                }, $queue->slideshow)));
            }
        }

        return response()->json([
            'counters' => $result,
            'ticker_text' => $tickerText,
            'slideshow' => $slideshow,
        ]);
    }

    /**
     * Admin endpoint — returns all counters + employee list.
     */
    public function adminShow()
    {
        $counters = QueueDisplay::orderBy('counter_code')->get();

        // Return employees whose linked user has antrian-kontrol access via modules, module_permissions, or admin role
        $employees = Employee::select('employees.id', 'employees.name', 'employees.position', 'employees.photo')
            ->join('users', 'employees.user_id', '=', 'users.id')
            ->where(function ($query) {
                $query->whereJsonContains('users.modules', 'antrian-kontrol')
                      ->orWhereJsonContains('users.modules', 'antrian-ulpk')
                      ->orWhere('users.module_permissions', 'LIKE', '%antrian-kontrol%')
                      ->orWhere('users.module_permissions', 'LIKE', '%antrian-ulpk%')
                      ->orWhere('users.base_role', 'admin');
            })
            ->orderBy('employees.name')
            ->get();

        return response()->json([
            'counters' => $counters,
            'employees' => $employees,
        ]);
    }

    /**
     * Call next queue number for a specific counter.
     */
    public function callNext(Request $request)
    {
        $request->validate(['counter_code' => ['required', 'string', 'in:A,B']]);

        $queue = $this->getOrCreateQueue($request->counter_code);
        $queue->increment('current_number');
        $queue->update(['last_called_at' => now()]);
        $queue->refresh();

        return response()->json([
            'counter_code' => $queue->counter_code,
            'current_number' => $queue->current_number,
            'message' => "Antrian {$queue->counter_code}-{$queue->current_number} dipanggil.",
        ]);
    }

    /**
     * Recall a specific counter.
     */
    public function recall(Request $request)
    {
        $request->validate(['counter_code' => ['required', 'string', 'in:A,B']]);

        $queue = $this->getOrCreateQueue($request->counter_code);
        if ($queue->current_number > 0) {
            $queue->update(['last_called_at' => now()]);
        }

        return response()->json([
            'counter_code' => $queue->counter_code,
            'message' => "Antrian {$queue->counter_code} dipanggil ulang.",
        ]);
    }

    /**
     * Recall all active counters.
     */
    public function recallAll()
    {
        $updated = [];
        $counters = QueueDisplay::where('status', 'active')->where('current_number', '>', 0)->get();
        foreach ($counters as $queue) {
            $queue->update(['last_called_at' => now()]);
            $updated[] = $queue->counter_code;
        }

        return response()->json([
            'counters' => $updated,
            'message' => count($updated) > 0 ? "Semua antrian aktif dipanggil ulang." : "Tidak ada antrian yang bisa dipanggil ulang.",
        ]);
    }

    /**
     * Set queue number manually for a specific counter.
     */
    public function setNumber(Request $request)
    {
        $request->validate([
            'counter_code' => ['required', 'string', 'in:A,B'],
            'number' => ['required', 'integer', 'min:0'],
        ]);

        $queue = $this->getOrCreateQueue($request->counter_code);
        $queue->update([
            'current_number' => $request->number,
            'last_called_at' => now()
        ]);

        return response()->json([
            'counter_code' => $queue->counter_code,
            'current_number' => $queue->current_number,
            'message' => "Antrian {$queue->counter_code} diatur ke {$queue->current_number}.",
        ]);
    }

    /**
     * Set the officer on duty for a specific counter.
     */
    public function setOfficer(Request $request)
    {
        $request->validate([
            'counter_code' => ['required', 'string', 'in:A,B'],
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
        ]);

        $employee = Employee::findOrFail($request->employee_id);
        $queue = $this->getOrCreateQueue($request->counter_code);

        $photo = $employee->photo;
        if ($photo && !str_starts_with($photo, 'http')) {
            $photo = '/' . ltrim($photo, '/');
        }

        $queue->update([
            'employee_id' => $employee->id,
            'employee_name' => $employee->name,
            'employee_photo' => $photo,
        ]);

        return response()->json([
            'counter_code' => $queue->counter_code,
            'employee_id' => $employee->id,
            'employee_name' => $employee->name,
            'employee_photo' => $photo,
            'message' => "Petugas {$queue->counter_code}: {$employee->name}",
        ]);
    }

    /**
     * Update ticker text (shared, stored on counter A).
     */
    public function updateTicker(Request $request)
    {
        $request->validate([
            'ticker_text' => ['nullable', 'array'],
            'ticker_text.*' => ['string', 'max:500'],
        ]);

        $queue = $this->getOrCreateQueue('A');
        $queue->update(['ticker_text' => $request->ticker_text]);

        return response()->json([
            'ticker_text' => $queue->ticker_text,
            'message' => 'Running text diperbarui.',
        ]);
    }

    /**
     * Toggle queue status for a specific counter.
     */
    public function toggleStatus(Request $request)
    {
        $request->validate(['counter_code' => ['required', 'string', 'in:A,B']]);

        $queue = $this->getOrCreateQueue($request->counter_code);
        $newStatus = $queue->status === 'active' ? 'closed' : 'active';
        $queue->update(['status' => $newStatus]);

        return response()->json([
            'counter_code' => $queue->counter_code,
            'status' => $newStatus,
            'message' => "Loket {$queue->counter_code}: " . ($newStatus === 'active' ? 'Dibuka' : 'Ditutup'),
        ]);
    }

    /**
     * Reset queue number to 0 for a specific counter.
     */
    public function resetQueue(Request $request)
    {
        $request->validate(['counter_code' => ['required', 'string', 'in:A,B']]);

        $queue = $this->getOrCreateQueue($request->counter_code);
        $queue->update(['current_number' => 0]);

        return response()->json([
            'counter_code' => $queue->counter_code,
            'current_number' => 0,
            'message' => "Antrian {$queue->counter_code} direset ke 0.",
        ]);
    }

    /**
     * Upload officer photo.
     */
    public function uploadPhoto(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'max:2048'],
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
        ]);

        $file = $request->file('file');
        $allowedMimes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!in_array($file->getMimeType(), $allowedMimes)) {
            return response()->json([
                'message' => 'Format file tidak didukung. Gunakan: PNG, JPG, WEBP',
            ], 422);
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: 'png');
        if ($extension === 'jpeg') $extension = 'jpg';
        $filename = 'officer-' . Str::random(12) . '.' . $extension;

        $publicDir = public_path('storage/queue-photos');
        if (!File::exists($publicDir)) {
            File::makeDirectory($publicDir, 0755, true);
        }
        $file->move($publicDir, $filename);
        $path = 'storage/queue-photos/' . $filename;

        // Copy to root storage
        $copiedToRoot = false;
        try {
            $rootStorageDir = dirname(base_path()) . '/public_html/storage/queue-photos';
            if (!File::exists($rootStorageDir)) {
                File::makeDirectory($rootStorageDir, 0755, true);
            }
            File::copy($publicDir . '/' . $filename, $rootStorageDir . '/' . $filename);
            $copiedToRoot = true;
        } catch (\Exception $e) {
            $copiedToRoot = false;
        }

        // Update employee photo
        $employee = Employee::findOrFail($request->employee_id);
        $employee->update(['photo' => $path]);

        // Update any queue displays with this employee
        QueueDisplay::where('employee_id', $employee->id)->update(['employee_photo' => $path]);

        $rootUrl = str_replace('/core_api', '', config('app.url', 'https://siptu.bpompalopo.com'));
        $fullUrl = $copiedToRoot
            ? rtrim($rootUrl, '/') . '/' . $path
            : rtrim($rootUrl, '/') . '/core_api/' . $path;

        return response()->json([
            'url' => $fullUrl,
            'path' => $path,
            'message' => 'Foto berhasil diupload.',
        ]);
    }

    /**
     * Upload slideshow image for TV display.
     */
    public function uploadSlide(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'max:5120'],
        ]);

        $file = $request->file('file');
        $allowedMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'video/mp4'];
        if (!in_array($file->getMimeType(), $allowedMimes)) {
            return response()->json([
                'message' => 'Format tidak didukung. Gunakan: PNG, JPG, WEBP, SVG, MP4',
            ], 422);
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: 'png');
        if ($extension === 'jpeg') $extension = 'jpg';
        $filename = 'slide-' . Str::random(12) . '.' . $extension;

        $publicDir = public_path('storage/queue-slides');
        if (!File::exists($publicDir)) {
            File::makeDirectory($publicDir, 0755, true);
        }
        $file->move($publicDir, $filename);
        $path = 'storage/queue-slides/' . $filename;

        try {
            $rootStorageDir = dirname(base_path()) . '/public_html/storage/queue-slides';
            if (!File::exists($rootStorageDir)) {
                File::makeDirectory($rootStorageDir, 0755, true);
            }
            File::copy($publicDir . '/' . $filename, $rootStorageDir . '/' . $filename);
        } catch (\Exception $e) {}

        $rootUrl = str_replace('/core_api', '', config('app.url', 'https://siptu.bpompalopo.com'));

        return response()->json([
            'url' => rtrim($rootUrl, '/') . '/' . $path,
            'path' => $path,
        ]);
    }

    /**
     * Update slideshow config (stored on counter A).
     */
    public function updateSlideshow(Request $request)
    {
        $request->validate([
            'slideshow' => ['nullable', 'array'],
            'slideshow.*.image' => ['required', 'string'],
            'slideshow.*.title' => ['nullable', 'string', 'max:120'],
            'slideshow.*.duration' => ['nullable', 'integer', 'min:3', 'max:60'],
        ]);

        $queue = $this->getOrCreateQueue('A');
        $slides = array_values(array_filter(
            $request->input('slideshow', []),
            fn($s) => is_array($s) && !empty($s['image'])
        ));
        $queue->update(['slideshow' => $slides]);

        return response()->json([
            'slideshow' => $queue->slideshow,
            'message' => 'Slideshow diperbarui.',
        ]);
    }

    /**
     * Get or create a queue display record by counter code.
     */
    private function getOrCreateQueue(string $code = 'A'): QueueDisplay
    {
        $queue = QueueDisplay::where('counter_code', $code)->first();
        if (!$queue) {
            $queue = QueueDisplay::create([
                'counter_code' => $code,
                'current_number' => 0,
                'counter_name' => 'ULPK',
                'status' => 'closed',
                'slideshow' => [],
            ]);
        }
        return $queue;
    }
}
