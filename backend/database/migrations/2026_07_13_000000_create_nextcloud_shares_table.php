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
        Schema::create('nextcloud_shares', function (Blueprint $table) {
            $table->id();
            $table->string('path', 1000); // Nextcloud file/folder relative path
            $table->string('token', 750)->unique(); // Base64 share token
            $table->boolean('can_edit')->default(false); // Guest write permissions
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nextcloud_shares');
    }
};
