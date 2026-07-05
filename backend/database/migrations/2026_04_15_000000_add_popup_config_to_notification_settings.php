<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notification_settings', function (Blueprint $table) {
            $table->json('popup_config')->nullable()->after('hero_slider');
            $table->unsignedSmallInteger('slider_duration')->nullable()->default(6)->after('popup_config');
        });
    }

    public function down(): void
    {
        Schema::table('notification_settings', function (Blueprint $table) {
            $table->dropColumn(['popup_config', 'slider_duration']);
        });
    }
};
