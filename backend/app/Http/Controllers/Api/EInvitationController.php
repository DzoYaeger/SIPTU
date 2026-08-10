<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EInvitation;
use App\Models\EInvitationGuest;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EInvitationController extends Controller
{
    /**
     * Display a listing of e-invitations created by or accessible to user.
     */
    public function index(Request $request)
    {
        try {
            $query = EInvitation::withCount([
                'guests',
                'guests as attending_count' => function ($q) {
                    $q->where('rsvp_status', 'attending');
                },
                'guests as declined_count' => function ($q) {
                    $q->where('rsvp_status', 'declined');
                },
                'guests as checked_in_count' => function ($q) {
                    $q->whereNotNull('checked_in_at');
                }
            ])->orderBy('event_date', 'desc')->orderBy('created_at', 'desc');

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('event_category', 'like', "%{$search}%")
                      ->orWhere('organizer', 'like', "%{$search}%");
                });
            }

            if ($request->filled('category')) {
                $query->where('event_category', $request->category);
            }

            $invitations = $query->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $invitations
            ]);
        } catch (\Exception $e) {
            Log::error('EInvitationController@index error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal memuat data undangan: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Store a newly created e-invitation.
     */
    public function store(Request $request)
    {
        if ($request->has('agenda_timeline') && is_string($request->input('agenda_timeline'))) {
            $request->merge(['agenda_timeline' => json_decode($request->input('agenda_timeline'), true)]);
        }
        if ($request->has('custom_config') && is_string($request->input('custom_config'))) {
            $request->merge(['custom_config' => json_decode($request->input('custom_config'), true)]);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'event_category' => 'required|string|max:100',
            'organizer' => 'nullable|string|max:255',
            'event_date' => 'required|date',
            'event_time_start' => 'required|string|max:20',
            'event_time_end' => 'nullable|string|max:20',
            'timezone' => 'nullable|string|max:20',
            'location_type' => 'required|string|in:offline,online,hybrid',
            'location_name' => 'nullable|string|max:255',
            'location_address' => 'nullable|string',
            'location_map_url' => 'nullable|string',
            'online_meeting_link' => 'nullable|string',
            'online_meeting_id' => 'nullable|string|max:100',
            'online_meeting_passcode' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'badge_text' => 'nullable|string|max:100',
            'intro_title' => 'nullable|string|max:255',
            'quote_text' => 'nullable|string',
            'quote_author' => 'nullable|string|max:255',
            'background_type' => 'nullable|string|in:image,video',
            'background_video_url' => 'nullable|string',
            'agenda_timeline' => 'nullable|array',
            'cover_image' => 'nullable|string',
            'music_bg_url' => 'nullable|string',
            'theme_color' => 'nullable|string|max:30',
            'font_family' => 'nullable|string|max:50',
            'custom_config' => 'nullable|array',
            'status' => 'nullable|string|in:draft,published,archived',
            'background_media_file' => 'nullable|file|mimes:mp4,webm,ogg,jpg,jpeg,png,webp|max:30720',
        ]);

        try {
            DB::beginTransaction();

            $baseSlug = Str::slug($validated['title']);
            $slug = $baseSlug;
            $count = 1;
            while (EInvitation::where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . $count++;
            }

            $validated['slug'] = $slug;
            $validated['organizer'] = $validated['organizer'] ?? 'Balai Besar POM di Palopo';
            $validated['timezone'] = $validated['timezone'] ?? 'WITA';
            $validated['theme_color'] = $validated['theme_color'] ?? 'bpom-navy';
            $validated['status'] = $validated['status'] ?? 'published';
            $validated['created_by'] = $request->user() ? $request->user()->id : null;

            // Handle cover image upload if file provided
            if ($request->hasFile('cover_image_file')) {
                $path = $request->file('cover_image_file')->store('e_invitations/covers', 'public');
                $validated['cover_image'] = '/storage/' . $path;
            }

            // Handle background video/image upload (max 30MB)
            if ($request->hasFile('background_media_file')) {
                $file = $request->file('background_media_file');
                $mime = $file->getMimeType();
                $path = $file->store('e_invitations/backgrounds', 'public');
                $url = '/storage/' . $path;

                if (str_contains($mime, 'video')) {
                    $validated['background_type'] = 'video';
                    $validated['background_video_url'] = $url;
                } else {
                    $validated['background_type'] = 'image';
                    $validated['cover_image'] = $url;
                }
            }

            $invitation = EInvitation::create($validated);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Undangan digital berhasil dibuat',
                'data' => $invitation
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('EInvitationController@store error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal membuat undangan: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified e-invitation.
     */
    public function show($id)
    {
        try {
            $invitation = EInvitation::withCount([
                'guests',
                'guests as attending_count' => function ($q) {
                    $q->where('rsvp_status', 'attending');
                },
                'guests as declined_count' => function ($q) {
                    $q->where('rsvp_status', 'declined');
                },
                'guests as checked_in_count' => function ($q) {
                    $q->whereNotNull('checked_in_at');
                }
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $invitation
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Undangan tidak ditemukan'], 404);
        }
    }

    /**
     * Update the specified e-invitation.
     */
    public function update(Request $request, $id)
    {
        $invitation = EInvitation::findOrFail($id);

        if ($request->has('agenda_timeline') && is_string($request->input('agenda_timeline'))) {
            $request->merge(['agenda_timeline' => json_decode($request->input('agenda_timeline'), true)]);
        }
        if ($request->has('custom_config') && is_string($request->input('custom_config'))) {
            $request->merge(['custom_config' => json_decode($request->input('custom_config'), true)]);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'event_category' => 'required|string|max:100',
            'organizer' => 'nullable|string|max:255',
            'event_date' => 'required|date',
            'event_time_start' => 'required|string|max:20',
            'event_time_end' => 'nullable|string|max:20',
            'timezone' => 'nullable|string|max:20',
            'location_type' => 'required|string|in:offline,online,hybrid',
            'location_name' => 'nullable|string|max:255',
            'location_address' => 'nullable|string',
            'location_map_url' => 'nullable|string',
            'online_meeting_link' => 'nullable|string',
            'online_meeting_id' => 'nullable|string|max:100',
            'online_meeting_passcode' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'badge_text' => 'nullable|string|max:100',
            'intro_title' => 'nullable|string|max:255',
            'quote_text' => 'nullable|string',
            'quote_author' => 'nullable|string|max:255',
            'background_type' => 'nullable|string|in:image,video',
            'background_video_url' => 'nullable|string',
            'agenda_timeline' => 'nullable|array',
            'cover_image' => 'nullable|string',
            'music_bg_url' => 'nullable|string',
            'theme_color' => 'nullable|string|max:30',
            'font_family' => 'nullable|string|max:50',
            'custom_config' => 'nullable|array',
            'status' => 'nullable|string|in:draft,published,archived',
            'background_media_file' => 'nullable|file|mimes:mp4,webm,ogg,jpg,jpeg,png,webp|max:30720',
        ]);

        try {
            DB::beginTransaction();

            if ($invitation->title !== $validated['title']) {
                $baseSlug = Str::slug($validated['title']);
                $slug = $baseSlug;
                $count = 1;
                while (EInvitation::where('slug', $slug)->where('id', '!=', $id)->exists()) {
                    $slug = $baseSlug . '-' . $count++;
                }
                $validated['slug'] = $slug;
            }

            if ($request->hasFile('cover_image_file')) {
                $path = $request->file('cover_image_file')->store('e_invitations/covers', 'public');
                $validated['cover_image'] = '/storage/' . $path;
            }

            if ($request->hasFile('background_media_file')) {
                $file = $request->file('background_media_file');
                $mime = $file->getMimeType();
                $path = $file->store('e_invitations/backgrounds', 'public');
                $url = '/storage/' . $path;

                if (str_contains($mime, 'video')) {
                    $validated['background_type'] = 'video';
                    $validated['background_video_url'] = $url;
                } else {
                    $validated['background_type'] = 'image';
                    $validated['cover_image'] = $url;
                }
            }

            $invitation->update($validated);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Undangan berhasil diperbarui',
                'data' => $invitation
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('EInvitationController@update error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal memperbarui undangan: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Remove the specified e-invitation.
     */
    public function destroy($id)
    {
        try {
            $invitation = EInvitation::findOrFail($id);
            $invitation->delete();

            return response()->json([
                'success' => true,
                'message' => 'Undangan berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Gagal menghapus undangan'], 500);
        }
    }

    /**
     * Get guests for a specific invitation.
     */
    public function getGuests(Request $request, $id)
    {
        try {
            $query = EInvitationGuest::where('e_invitation_id', $id)
                ->orderBy('created_at', 'desc');

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('guest_name', 'like', "%{$search}%")
                      ->orWhere('guest_institution', 'like', "%{$search}%")
                      ->orWhere('guest_email', 'like', "%{$search}%")
                      ->orWhere('guest_phone', 'like', "%{$search}%");
                });
            }

            if ($request->filled('rsvp_status')) {
                $query->where('rsvp_status', $request->rsvp_status);
            }

            if ($request->filled('category')) {
                $query->where('guest_category', $request->category);
            }

            $guests = $query->get();

            return response()->json([
                'success' => true,
                'data' => $guests
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Gagal memuat daftar tamu'], 500);
        }
    }

    /**
     * Add a single guest to invitation.
     */
    public function addGuest(Request $request, $id)
    {
        $validated = $request->validate([
            'guest_name' => 'required|string|max:255',
            'guest_institution' => 'nullable|string|max:255',
            'guest_email' => 'nullable|email|max:255',
            'guest_phone' => 'nullable|string|max:50',
            'guest_category' => 'nullable|string|max:50',
            'pax_count' => 'nullable|integer|min:1',
        ]);

        try {
            $invitation = EInvitation::findOrFail($id);

            $token = Str::random(12);
            $qrSecret = 'INV-' . strtoupper(Str::random(8)) . '-' . rand(1000, 9999);

            $guest = EInvitationGuest::create([
                'e_invitation_id' => $invitation->id,
                'guest_name' => $validated['guest_name'],
                'guest_institution' => $validated['guest_institution'] ?? null,
                'guest_email' => $validated['guest_email'] ?? null,
                'guest_phone' => $validated['guest_phone'] ?? null,
                'guest_category' => $validated['guest_category'] ?? 'Reguler',
                'pax_count' => $validated['pax_count'] ?? 1,
                'token' => $token,
                'qr_code_secret' => $qrSecret,
                'rsvp_status' => 'pending',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Tamu berhasil ditambahkan',
                'data' => $guest
            ], 201);
        } catch (\Exception $e) {
            Log::error('EInvitationController@addGuest error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal menambahkan tamu: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Bulk add guests from text list or array.
     */
    public function bulkAddGuests(Request $request, $id)
    {
        $validated = $request->validate([
            'guests' => 'required|array',
            'guests.*.guest_name' => 'required|string|max:255',
            'guests.*.guest_institution' => 'nullable|string|max:255',
            'guests.*.guest_category' => 'nullable|string|max:50',
        ]);

        try {
            DB::beginTransaction();

            $invitation = EInvitation::findOrFail($id);
            $createdGuests = [];

            foreach ($validated['guests'] as $item) {
                if (empty(trim($item['guest_name']))) continue;

                $token = Str::random(12);
                $qrSecret = 'INV-' . strtoupper(Str::random(8)) . '-' . rand(1000, 9999);

                $createdGuests[] = EInvitationGuest::create([
                    'e_invitation_id' => $invitation->id,
                    'guest_name' => trim($item['guest_name']),
                    'guest_institution' => isset($item['guest_institution']) ? trim($item['guest_institution']) : null,
                    'guest_category' => isset($item['guest_category']) ? trim($item['guest_category']) : 'Reguler',
                    'token' => $token,
                    'qr_code_secret' => $qrSecret,
                    'rsvp_status' => 'pending',
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => count($createdGuests) . ' tamu berhasil ditambahkan',
                'data' => $createdGuests
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Gagal impor tamu: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete guest.
     */
    public function deleteGuest($id, $guestId)
    {
        try {
            $guest = EInvitationGuest::where('e_invitation_id', $id)->where('id', $guestId)->firstOrFail();
            $guest->delete();

            return response()->json([
                'success' => true,
                'message' => 'Tamu berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Gagal menghapus tamu'], 500);
        }
    }

    /**
     * Check-in guest via QR Code.
     */
    public function checkInGuest(Request $request, $id)
    {
        $validated = $request->validate([
            'qr_code_secret' => 'required|string',
        ]);

        try {
            $guest = EInvitationGuest::where('e_invitation_id', $id)
                ->where(function ($q) use ($validated) {
                    $q->where('qr_code_secret', $validated['qr_code_secret'])
                      ->orWhere('token', $validated['qr_code_secret']);
                })->first();

            if (!$guest) {
                return response()->json([
                    'success' => false,
                    'message' => 'QR Code tidak valid atau tamu tidak terdaftar pada undangan ini'
                ], 404);
            }

            $alreadyCheckedIn = !is_null($guest->checked_in_at);

            $guest->update([
                'checked_in_at' => now(),
                'checked_in_by' => $request->user() ? $request->user()->id : null,
                'rsvp_status' => 'attending' // Automatically mark as attending if present
            ]);

            return response()->json([
                'success' => true,
                'already_checked_in' => $alreadyCheckedIn,
                'message' => $alreadyCheckedIn ? 'Tamu sudah melakukan presensi sebelumnya' : 'Presensi berhasil dicatat!',
                'data' => $guest
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Gagal memproses presensi: ' . $e->getMessage()], 500);
        }
    }

    // ==================== PUBLIC UNAUTHENTICATED ENDPOINTS ====================

    /**
     * Get public invitation by slug.
     */
    public function getPublicInvitation(Request $request, $slug)
    {
        try {
            $invitation = EInvitation::where('slug', $slug)
                ->where('status', 'published')
                ->firstOrFail();

            // Check if guest token passed as query param ?to=Token or ?tamu=Name
            $guest = null;
            if ($request->filled('token')) {
                $guest = EInvitationGuest::where('e_invitation_id', $invitation->id)
                    ->where('token', $request->token)
                    ->first();
            } elseif ($request->filled('to')) {
                $tokenOrName = urldecode($request->to);
                $guest = EInvitationGuest::where('e_invitation_id', $invitation->id)
                    ->where(function ($q) use ($tokenOrName) {
                        $q->where('token', $tokenOrName)
                          ->orWhere('guest_name', $tokenOrName);
                    })->first();
            }

            // Recent public wishes / guestbook
            $wishes = EInvitationGuest::where('e_invitation_id', $invitation->id)
                ->whereNotNull('wishes_or_notes')
                ->where('wishes_or_notes', '!=', '')
                ->select('guest_name', 'guest_institution', 'rsvp_status', 'wishes_or_notes', 'updated_at')
                ->orderBy('updated_at', 'desc')
                ->take(30)
                ->get();

            // Total attending count
            $attendingCount = EInvitationGuest::where('e_invitation_id', $invitation->id)
                ->where('rsvp_status', 'attending')
                ->sum('pax_count');

            return response()->json([
                'success' => true,
                'data' => [
                    'invitation' => $invitation,
                    'guest' => $guest,
                    'wishes' => $wishes,
                    'attending_pax' => $attendingCount,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Undangan tidak ditemukan atau belum dipublikasikan'
            ], 404);
        }
    }

    /**
     * Submit RSVP & wishes from public guest page.
     */
    public function submitPublicRsvp(Request $request, $slug)
    {
        $validated = $request->validate([
            'guest_name' => 'required|string|max:255',
            'guest_institution' => 'nullable|string|max:255',
            'guest_email' => 'nullable|email|max:255',
            'guest_phone' => 'nullable|string|max:50',
            'rsvp_status' => 'required|string|in:attending,declined,tentative',
            'pax_count' => 'nullable|integer|min:1|max:10',
            'wishes_or_notes' => 'nullable|string|max:1000',
            'token' => 'nullable|string',
        ]);

        try {
            $invitation = EInvitation::where('slug', $slug)->firstOrFail();

            $guest = null;
            if (!empty($validated['token'])) {
                $guest = EInvitationGuest::where('e_invitation_id', $invitation->id)
                    ->where('token', $validated['token'])
                    ->first();
            }

            if (!$guest) {
                // Check if existing guest with same name
                $guest = EInvitationGuest::where('e_invitation_id', $invitation->id)
                    ->where('guest_name', $validated['guest_name'])
                    ->first();
            }

            if ($guest) {
                $guest->update([
                    'guest_institution' => $validated['guest_institution'] ?? $guest->guest_institution,
                    'guest_email' => $validated['guest_email'] ?? $guest->guest_email,
                    'guest_phone' => $validated['guest_phone'] ?? $guest->guest_phone,
                    'rsvp_status' => $validated['rsvp_status'],
                    'pax_count' => $validated['pax_count'] ?? 1,
                    'wishes_or_notes' => $validated['wishes_or_notes'] ?? $guest->wishes_or_notes,
                ]);
            } else {
                // Register new walk-in / public guest
                $token = Str::random(12);
                $qrSecret = 'INV-' . strtoupper(Str::random(8)) . '-' . rand(1000, 9999);

                $guest = EInvitationGuest::create([
                    'e_invitation_id' => $invitation->id,
                    'guest_name' => $validated['guest_name'],
                    'guest_institution' => $validated['guest_institution'] ?? null,
                    'guest_email' => $validated['guest_email'] ?? null,
                    'guest_phone' => $validated['guest_phone'] ?? null,
                    'guest_category' => 'External',
                    'token' => $token,
                    'qr_code_secret' => $qrSecret,
                    'rsvp_status' => $validated['rsvp_status'],
                    'pax_count' => $validated['pax_count'] ?? 1,
                    'wishes_or_notes' => $validated['wishes_or_notes'] ?? null,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Terima kasih, konfirmasi kehadiran Anda berhasil disimpan!',
                'data' => $guest
            ]);
        } catch (\Exception $e) {
            Log::error('EInvitationController@submitPublicRsvp error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal menyimpan RSVP: ' . $e->getMessage()], 500);
        }
    }
}
