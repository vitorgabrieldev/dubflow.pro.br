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
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->unique()->nullable()->after('name');
            $table->string('stage_name')->nullable()->after('username');
            $table->text('bio')->nullable()->after('stage_name');
            $table->string('avatar_path')->nullable()->after('bio');
            $table->string('cover_path')->nullable()->after('avatar_path');
            $table->string('website_url')->nullable()->after('cover_path');
            $table->string('locale', 10)->default('pt-BR')->after('website_url');
            $table->boolean('is_private')->default(false)->after('locale');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'username',
                'stage_name',
                'bio',
                'avatar_path',
                'cover_path',
                'website_url',
                'locale',
                'is_private',
            ]);
        });
    }
};
