<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EInvitationGuest extends Model
{
    use HasFactory;

    protected $table = 'e_invitation_guests';

    protected $fillable = [
        'e_invitation_id',
        'guest_name',
        'guest_institution',
        'guest_email',
        'guest_phone',
        'guest_category',
        'token',
        'qr_code_secret',
        'rsvp_status',
        'pax_count',
        'wishes_or_notes',
        'checked_in_at',
        'checked_in_by',
    ];

    protected $casts = [
        'checked_in_at' => 'datetime',
        'pax_count' => 'integer',
    ];

    public function invitation()
    {
        return $this->belongsTo(EInvitation::class, 'e_invitation_id');
    }

    public function checkedInByUser()
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }
}
