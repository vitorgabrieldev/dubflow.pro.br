<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('editor_projects', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('owner_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('source_language', 10)->default('ja');
            $table->string('target_language', 10)->default('pt-BR');
            $table->enum('status', ['draft', 'rendering', 'rendered', 'failed', 'archived'])->default('draft');
            $table->json('timeline_json')->nullable();
            $table->unsignedBigInteger('storage_bytes')->default(0);
            $table->unsignedInteger('duration_ms')->nullable();
            $table->timestamp('autosaved_at')->nullable();
            $table->timestamp('rendered_at')->nullable();
            $table->timestamp('source_assets_purged_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'created_at']);
            $table->index(['owner_user_id', 'updated_at']);
            $table->index(['status', 'updated_at']);
        });

        Schema::create('editor_project_assets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id')->constrained('editor_projects')->cascadeOnDelete();
            $table->enum('asset_type', ['video', 'audio', 'subtitle', 'image'])->default('video');
            $table->string('label')->nullable();
            $table->string('path');
            $table->string('disk', 20)->default('local');
            $table->string('mime', 120)->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->unsignedInteger('duration_ms')->nullable();
            $table->unsignedInteger('video_width')->nullable();
            $table->unsignedInteger('video_height')->nullable();
            $table->decimal('fps', 8, 3)->nullable();
            $table->unsignedInteger('sample_rate')->nullable();
            $table->unsignedTinyInteger('channels')->nullable();
            $table->string('waveform_path')->nullable();
            $table->string('thumbnail_path')->nullable();
            $table->string('preview_frame_path')->nullable();
            $table->json('metadata_json')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'asset_type']);
            $table->index(['project_id', 'sort_order']);
        });

        Schema::create('editor_project_subtitles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id')->constrained('editor_projects')->cascadeOnDelete();
            $table->string('language_code', 10)->default('pt-BR');
            $table->unsignedInteger('start_ms');
            $table->unsignedInteger('end_ms');
            $table->text('text');
            $table->json('style_json')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['project_id', 'language_code', 'start_ms']);
        });

        Schema::create('editor_project_comments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id')->constrained('editor_projects')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('timestamp_ms');
            $table->text('body');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'timestamp_ms']);
        });

        Schema::create('editor_project_renders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id')->constrained('editor_projects')->cascadeOnDelete();
            $table->foreignId('requested_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['queued', 'processing', 'completed', 'failed', 'cancelled'])->default('queued');
            $table->unsignedTinyInteger('progress_percent')->default(0);
            $table->enum('preset', ['preview_720p', 'full_hd_1080p', 'ultra_hd_4k'])->default('full_hd_1080p');
            $table->enum('output_mode', ['video_with_soft_subtitles', 'video_with_burned_subtitles', 'video_no_subtitles', 'audio_only'])
                ->default('video_with_soft_subtitles');
            $table->string('output_path')->nullable();
            $table->string('output_disk', 20)->default('local');
            $table->unsignedBigInteger('output_size_bytes')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'created_at']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('editor_project_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id')->constrained('editor_projects')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event_type', 80);
            $table->json('payload_json')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'created_at']);
            $table->index(['event_type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('editor_project_events');
        Schema::dropIfExists('editor_project_renders');
        Schema::dropIfExists('editor_project_comments');
        Schema::dropIfExists('editor_project_subtitles');
        Schema::dropIfExists('editor_project_assets');
        Schema::dropIfExists('editor_projects');
    }
};
