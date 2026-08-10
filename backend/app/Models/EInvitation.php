<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EInvitation extends Model
{
    use HasFactory;

    protected $table = 'e_invitations';

    protected $fillable = [
        'slug',
        'title',
        'event_category',
        'organizer',
        'event_date',
        'event_time_start',
        'event_time_end',
        'timezone',
        'location_type',
        'location_name',
        'location_address',
        'location_map_url',
        'online_meeting_link',
        'online_meeting_id',
        'online_meeting_passcode',
        'description',
        'badge_text',
        'intro_title',
        'quote_text',
        'quote_author',
        'background_type',
        'background_video_url',
        'agenda_timeline',
        'cover_image',
        'music_bg_url',
        'theme_color',
        'font_family',
        'custom_config',
        'status',
        'created_by',
    ];

    protected $casts = [
        'event_date' => 'date:Y-m-d',
        'agenda_timeline' => 'array',
        'custom_config' => 'array',
    ];

    public function guests()
    {
        return $this->hasMany(EInvitationGuest::class, 'e_invitation_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
