<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('skills')->nullable()->after('website_url');
            $table->json('social_links')->nullable()->after('skills');
            $table->json('profile_links')->nullable()->after('social_links');
            $table->json('tags')->nullable()->after('profile_links');
            $table->text('dubbing_history')->nullable()->after('tags');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'skills',
                'social_links',
                'profile_links',
                'tags',
                'dubbing_history',
            ]);
        });
    }
};

