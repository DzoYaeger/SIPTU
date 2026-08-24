<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationSetting extends Model
{
    protected $fillable = [
        'fonnte_token',
        'fonnte_endpoint',
        'default_admin_numbers',
        'recipients',
        'kgb_window',
        'surat_tugas_templates',
        'pdtt_service_enabled',
        'hero_slider',
        'exit_permit_settings',
        'popup_config',
        'slider_duration',
        'kepala_balai_settings',
        'layanan_filter_config',
    ];

    protected function casts(): array
    {
        return [
            'default_admin_numbers' => 'array',
            'recipients' => 'array',
            'kgb_window' => 'array',
            'surat_tugas_templates' => 'array',
            'pdtt_service_enabled' => 'boolean',
            'hero_slider' => 'array',
            'exit_permit_settings' => 'array',
            'popup_config' => 'array',
            'slider_duration' => 'integer',
            'kepala_balai_settings' => 'array',
            'layanan_filter_config' => 'array',
        ];
    }

}
