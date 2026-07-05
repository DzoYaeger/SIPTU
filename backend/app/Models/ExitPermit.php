<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use App\Models\NotificationSetting;

class ExitPermit extends Model
{
    use HasFactory;

    protected $guarded = ['id'];
    protected $appends = [
        'exit_at_iso',
        'return_at_iso',
        'duration_seconds_effective',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'return_recorded_by_admin' => 'boolean',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function getExitAtIsoAttribute(): ?string
    {
        if (!$this->date || !$this->exit_time) {
            return null;
        }

        return Carbon::parse(
            $this->date->format('Y-m-d') . ' ' . $this->exit_time,
            'Asia/Makassar'
        )->toIso8601String();
    }

    public function getReturnAtIsoAttribute(): ?string
    {
        if (!$this->date || !$this->return_time) {
            return null;
        }

        return Carbon::parse(
            $this->date->format('Y-m-d') . ' ' . $this->return_time,
            'Asia/Makassar'
        )->toIso8601String();
    }

    public function getDurationSecondsEffectiveAttribute(): ?int
    {
        if ($this->duration_seconds !== null) {
            return max(0, (int) $this->duration_seconds);
        }

        if (!$this->exit_at_iso) {
            return null;
        }

        $startMoment = Carbon::parse($this->exit_at_iso);
        $endMoment = null;

        if ($this->status === 'out') {
            $endMoment = Carbon::now('Asia/Makassar');
        } elseif ($this->return_at_iso) {
            $endMoment = Carbon::parse($this->return_at_iso);
        }

        if (!$endMoment) {
            return null;
        }

        return $this->calculateEffectiveSeconds($this->date, $startMoment, $endMoment);
    }

    /**
     * Helper: Calculate effective seconds minus break times.
     */
    private function calculateEffectiveSeconds($date, $startMoment, $endMoment)
    {
        $totalSeconds = $startMoment->diffInSeconds($endMoment);

        $settingsRow = NotificationSetting::first();
        $settings = $settingsRow?->exit_permit_settings;
        if (!$settings) {
            return max(0, $totalSeconds);
        }

        $dayOfWeek = $startMoment->dayOfWeek; // 0 (Sun) - 6 (Sat)
        $isFriday = ($dayOfWeek === 5);
        $isMonToThu = ($dayOfWeek >= 1 && $dayOfWeek <= 4);

        $breakConfig = null;
        if ($isFriday) {
            $breakConfig = $settings['fri'] ?? null;
        } elseif ($isMonToThu) {
            $breakConfig = $settings['mon_thu'] ?? null;
        }

        if (!$breakConfig || empty($breakConfig['start']) || empty($breakConfig['end'])) {
            return max(0, $totalSeconds);
        }

        $dateStr = $date instanceof Carbon ? $date->format('Y-m-d') : Carbon::parse($date)->format('Y-m-d');

        $breakStart = Carbon::parse($dateStr . ' ' . $breakConfig['start'] . ':00', 'Asia/Makassar');
        $breakEnd = Carbon::parse($dateStr . ' ' . $breakConfig['end'] . ':00', 'Asia/Makassar');

        // Overlap calculation
        $overlapStart = $startMoment->gt($breakStart) ? $startMoment : $breakStart;
        $overlapEnd = $endMoment->lt($breakEnd) ? $endMoment : $breakEnd;

        if ($overlapStart->lt($overlapEnd)) {
            $overlapSeconds = $overlapStart->diffInSeconds($overlapEnd);
            return (int) max(0, $totalSeconds - $overlapSeconds);
        }

        return (int) max(0, $totalSeconds);
    }
}
