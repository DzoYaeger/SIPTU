<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add password reset and expiry fields to users table
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'password_changed_at')) {
                $table->timestamp('password_changed_at')->nullable()->after('password');
            }
            if (!Schema::hasColumn('users', 'must_reset_password')) {
                $table->boolean('must_reset_password')->default(true)->after('password_changed_at');
            }
        });

        // Create password histories table
        if (!Schema::hasTable('password_histories')) {
            Schema::create('password_histories', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->string('password');
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        // Force reset on all existing users by setting must_reset_password = true
        // and populate password_histories with current password hashes so they cannot reuse them
        $users = DB::table('users')->get();
        foreach ($users as $user) {
            DB::table('users')->where('id', $user->id)->update([
                'must_reset_password' => true,
                'password_changed_at' => null,
            ]);

            // Save current password hash to history so it can't be reused
            $exists = DB::table('password_histories')
                ->where('user_id', $user->id)
                ->where('password', $user->password)
                ->exists();

            if (!$exists) {
                DB::table('password_histories')->insert([
                    'user_id' => $user->id,
                    'password' => $user->password,
                    'created_at' => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('password_histories');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['password_changed_at', 'must_reset_password']);
        });
    }
};
