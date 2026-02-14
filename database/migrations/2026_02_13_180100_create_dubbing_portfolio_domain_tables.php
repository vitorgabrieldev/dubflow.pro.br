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
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('avatar_path')->nullable();
            $table->string('cover_path')->nullable();
            $table->string('website_url')->nullable();
            $table->boolean('is_public')->default(true);
            $table->boolean('is_verified')->default(false);
            $table->json('settings')->nullable();
            $table->timestamps();

            $table->index(['is_public', 'created_at']);
        });

        Schema::create('organization_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role', 20)->default('member');
            $table->string('status', 20)->default('active');
            $table->foreignId('invited_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('joined_at')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'user_id']);
            $table->index(['user_id', 'status']);
        });

        Schema::create('organization_follows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['organization_id', 'user_id']);
        });

        Schema::create('playlists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('title');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->string('work_title')->nullable();
            $table->unsignedInteger('season_number')->nullable();
            $table->unsignedInteger('release_year')->nullable();
            $table->string('cover_path')->nullable();
            $table->string('visibility', 20)->default('public');
            $table->timestamps();

            $table->unique(['organization_id', 'slug']);
            $table->index(['organization_id', 'visibility', 'created_at']);
        });

        Schema::create('dubbing_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('playlist_id')->nullable()->constrained('playlists')->nullOnDelete();
            $table->foreignId('author_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('media_path');
            $table->string('media_type', 20);
            $table->unsignedBigInteger('media_size_bytes')->default(0);
            $table->string('thumbnail_path')->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->string('visibility', 20)->default('public');
            $table->boolean('allow_comments')->default(true);
            $table->string('language_code', 10)->default('pt-BR');
            $table->string('content_license', 40)->default('all_rights_reserved');
            $table->timestamp('published_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'created_at']);
            $table->index(['playlist_id', 'created_at']);
            $table->index(['visibility', 'published_at']);
            $table->index(['media_type', 'language_code']);
        });

        Schema::create('post_collaborators', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('dubbing_posts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('invited_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('pending');
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->unique(['post_id', 'user_id']);
            $table->index(['user_id', 'status']);
        });

        Schema::create('post_credits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('dubbing_posts')->cascadeOnDelete();
            $table->string('character_name')->nullable();
            $table->foreignId('dubber_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('dubber_name')->nullable();
            $table->unsignedInteger('display_order')->default(0);
            $table->timestamps();

            $table->index(['post_id', 'display_order']);
        });

        Schema::create('post_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('dubbing_posts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['post_id', 'user_id']);
        });

        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('dubbing_posts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('comments')->cascadeOnDelete();
            $table->text('body');
            $table->timestamp('edited_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['post_id', 'created_at']);
        });

        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->timestamps();
        });

        Schema::create('dubbing_post_tag', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('dubbing_posts')->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained('tags')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['post_id', 'tag_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dubbing_post_tag');
        Schema::dropIfExists('tags');
        Schema::dropIfExists('comments');
        Schema::dropIfExists('post_likes');
        Schema::dropIfExists('post_credits');
        Schema::dropIfExists('post_collaborators');
        Schema::dropIfExists('dubbing_posts');
        Schema::dropIfExists('playlists');
        Schema::dropIfExists('organization_follows');
        Schema::dropIfExists('organization_members');
        Schema::dropIfExists('organizations');
    }
};
