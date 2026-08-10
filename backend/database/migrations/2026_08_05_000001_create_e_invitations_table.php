<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('e_invitations', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('event_category')->default('KIE BPOM'); // KIE BPOM, Rapat Internal BPOM, Sosialisasi, Workshop, Formal, Custom
            $table->string('organizer')->default('Balai Besar POM di Palopo');
            $table->date('event_date');
            $table->string('event_time_start', 20);
            $table->string('event_time_end', 20)->nullable();
            $table->string('timezone', 20)->default('WITA');
            $table->string('location_type', 20)->default('offline'); // offline, online, hybrid
            $table->string('location_name')->nullable();
            $table->text('location_address')->nullable();
            $table->text('location_map_url')->nullable();
            $table->text('online_meeting_link')->nullable();
            $table->string('online_meeting_id', 100)->nullable();
            $table->string('online_meeting_passcode', 50)->nullable();
            $table->text('description')->nullable();
            $table->json('agenda_timeline')->nullable();
            $table->text('cover_image')->nullable();
            $table->text('music_bg_url')->nullable();
            $table->string('theme_color', 30)->default('bpom-navy'); // bpom-navy, royal-emerald, classic-gold, modern-slate, sunset-rose
            $table->string('font_family', 50)->default('Segoe UI');
            $table->json('custom_config')->nullable(); // enable_rsvp, enable_guestbook, enable_countdown, enable_qr, dress_code, etc.
            $table->string('status', 20)->default('published'); // draft, published, archived
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('e_invitation_guests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('e_invitation_id')->constrained('e_invitations')->cascadeOnDelete();
            $table->string('guest_name');
            $table->string('guest_institution')->nullable();
            $table->string('guest_email')->nullable();
            $table->string('guest_phone')->nullable();
            $table->string('guest_category', 50)->default('Reguler'); // VIP, Internal, External, Reguler
            $table->string('token', 64)->unique();
            $table->string('qr_code_secret', 64)->unique();
            $table->string('rsvp_status', 20)->default('pending'); // pending, attending, declined, tentative
            $table->integer('pax_count')->default(1);
            $table->text('wishes_or_notes')->nullable();
            $table->timestamp('checked_in_at')->nullable();
            $table->foreignId('checked_in_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('e_invitation_guests');
        Schema::dropIfExists('e_invitations');
    }
};
