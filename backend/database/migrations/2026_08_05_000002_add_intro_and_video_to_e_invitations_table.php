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
        Schema::table('e_invitations', function (Blueprint $table) {
            $table->string('badge_text', 100)->default('PENGANTAR')->after('description');
            $table->string('intro_title')->default('Menuju Birokrasi Cerdas')->after('badge_text');
            $table->text('quote_text')->nullable()->after('intro_title');
            $table->string('quote_author')->nullable()->after('quote_text');
            $table->string('background_type', 20)->default('image')->after('quote_author'); // image, video
            $table->text('background_video_url')->nullable()->after('background_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('e_invitations', function (Blueprint $table) {
            $table->dropColumn([
                'badge_text',
                'intro_title',
                'quote_text',
                'quote_author',
                'background_type',
                'background_video_url',
            ]);
        });
    }
};
