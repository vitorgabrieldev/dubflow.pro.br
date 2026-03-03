<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table): void {
            if (! Schema::hasColumn('organizations', 'deleted_at')) {
                $table->softDeletes()->index();
            }
        });

        Schema::table('playlists', function (Blueprint $table): void {
            if (! Schema::hasColumn('playlists', 'deleted_at')) {
                $table->softDeletes()->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('playlists', function (Blueprint $table): void {
            if (Schema::hasColumn('playlists', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('organizations', function (Blueprint $table): void {
            if (Schema::hasColumn('organizations', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};
