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
        Schema::create('dubbing_tests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('visibility', 20)->default('external');
            $table->string('status', 20)->default('draft');
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->timestamp('results_release_at');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['visibility', 'status', 'starts_at', 'ends_at'], 'dub_tests_vis_status_dates_idx');
            $table->index(['organization_id', 'status', 'created_at'], 'dub_tests_org_status_created_idx');
        });

        Schema::create('dubbing_test_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dubbing_test_id')->constrained('dubbing_tests')->cascadeOnDelete();
            $table->string('media_path');
            $table->string('media_type', 20);
            $table->string('disk', 20)->default('local');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('dubbing_test_characters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dubbing_test_id')->constrained('dubbing_tests')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->text('expectations')->nullable();
            $table->string('appearance_estimate', 30)->default('coadjuvante');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('dubbing_test_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dubbing_test_id')->constrained('dubbing_tests')->cascadeOnDelete();
            $table->foreignId('character_id')->constrained('dubbing_test_characters')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('cover_letter')->nullable();
            $table->string('status', 20)->default('submitted');
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('visible_to_candidate_at')->nullable();
            $table->timestamp('results_notified_at')->nullable();
            $table->timestamps();

            $table->unique(['character_id', 'user_id'], 'dub_test_char_user_unique');
            $table->index(['dubbing_test_id', 'status'], 'dub_test_submissions_status_idx');
            $table->index(['visible_to_candidate_at', 'results_notified_at'], 'dub_test_release_notify_idx');
        });

        Schema::create('dubbing_test_submission_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->constrained('dubbing_test_submissions')->cascadeOnDelete();
            $table->string('media_path');
            $table->string('media_type', 20);
            $table->string('disk', 20)->default('local');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 120);
            $table->string('auditable_type', 120);
            $table->unsignedBigInteger('auditable_id');
            $table->foreignId('organization_id')->nullable()->constrained('organizations')->nullOnDelete();
            $table->json('before_json')->nullable();
            $table->json('after_json')->nullable();
            $table->json('meta_json')->nullable();
            $table->string('ip', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['auditable_type', 'auditable_id'], 'audit_logs_auditable_idx');
            $table->index(['organization_id', 'created_at'], 'audit_logs_org_created_idx');
            $table->index(['action', 'created_at'], 'audit_logs_action_created_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('dubbing_test_submission_media');
        Schema::dropIfExists('dubbing_test_submissions');
        Schema::dropIfExists('dubbing_test_characters');
        Schema::dropIfExists('dubbing_test_media');
        Schema::dropIfExists('dubbing_tests');
    }
};
