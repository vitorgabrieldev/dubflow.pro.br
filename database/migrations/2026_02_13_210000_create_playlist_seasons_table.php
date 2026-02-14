<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('playlist_seasons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('playlist_id')->constrained('playlists')->cascadeOnDelete();
            $table->unsignedInteger('season_number');
            $table->string('title')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['playlist_id', 'season_number']);
            $table->index(['playlist_id', 'created_at']);
        });

        Schema::table('dubbing_posts', function (Blueprint $table) {
            $table->foreignId('season_id')->nullable()->after('playlist_id')->constrained('playlist_seasons')->nullOnDelete();
            $table->index(['playlist_id', 'season_id', 'created_at']);
        });

        $playlists = DB::table('playlists')
            ->select(['id', 'season_number', 'created_at', 'updated_at'])
            ->whereNotNull('season_number')
            ->get();

        foreach ($playlists as $playlist) {
            $seasonId = DB::table('playlist_seasons')->insertGetId([
                'playlist_id' => $playlist->id,
                'season_number' => (int) $playlist->season_number,
                'title' => 'Temporada '.(int) $playlist->season_number,
                'created_at' => $playlist->created_at,
                'updated_at' => $playlist->updated_at,
            ]);

            DB::table('dubbing_posts')
                ->where('playlist_id', $playlist->id)
                ->whereNull('season_id')
                ->update(['season_id' => $seasonId]);
        }

        DB::table('playlists')->update(['visibility' => 'public']);
    }

    public function down(): void
    {
        Schema::table('dubbing_posts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('season_id');
        });

        Schema::dropIfExists('playlist_seasons');
    }
};
