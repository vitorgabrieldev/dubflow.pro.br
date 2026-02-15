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
        Schema::create('achievement_definitions', function (Blueprint $table): void {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('category', 60)->index();
            $table->string('metric_key', 120)->index();
            $table->string('rarity', 32)->default('common');
            $table->string('icon', 80)->default('trophy');
            $table->string('color_start', 16)->default('#94A3B8');
            $table->string('color_end', 16)->default('#CBD5E1');
            $table->unsignedInteger('display_order')->default(0);
            $table->unsignedInteger('valid_for_days')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_hidden')->default(false);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('achievement_levels', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('achievement_definition_id')->constrained('achievement_definitions')->cascadeOnDelete();
            $table->unsignedSmallInteger('level');
            $table->unsignedBigInteger('threshold');
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->string('rarity', 32)->nullable();
            $table->string('icon', 80)->nullable();
            $table->string('color_start', 16)->nullable();
            $table->string('color_end', 16)->nullable();
            $table->unsignedInteger('valid_for_days')->nullable();
            $table->unsignedInteger('display_order')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['achievement_definition_id', 'level'], 'al_definition_level_unique');
            $table->unique(['achievement_definition_id', 'threshold'], 'al_definition_threshold_unique');
        });

        Schema::create('user_achievement_progress', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('achievement_definition_id')->constrained('achievement_definitions')->cascadeOnDelete();
            $table->unsignedBigInteger('progress_value')->default(0);
            $table->timestamp('last_event_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'achievement_definition_id'], 'uap_user_definition_unique');
        });

        Schema::create('user_achievements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('achievement_definition_id')->constrained('achievement_definitions')->cascadeOnDelete();
            $table->foreignId('achievement_level_id')->nullable()->constrained('achievement_levels')->nullOnDelete();
            $table->unsignedSmallInteger('level');
            $table->unsignedBigInteger('progress_value_at_unlock')->default(0);
            $table->timestamp('unlocked_at');
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('notified_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'achievement_definition_id', 'level'], 'ua_user_definition_level_unique');
            $table->index(['user_id', 'unlocked_at'], 'ua_user_unlocked_idx');
        });

        Schema::create('achievement_feed_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_achievement_id')->constrained('user_achievements')->cascadeOnDelete();
            $table->foreignId('achievement_definition_id')->constrained('achievement_definitions')->cascadeOnDelete();
            $table->foreignId('achievement_level_id')->nullable()->constrained('achievement_levels')->nullOnDelete();
            $table->unsignedSmallInteger('level');
            $table->timestamp('unlocked_at');
            $table->timestamps();

            $table->index(['user_id', 'unlocked_at'], 'afi_user_unlocked_idx');
        });

        Schema::create('achievement_comment_uniques', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('post_id')->constrained('dubbing_posts')->cascadeOnDelete();
            $table->foreignId('first_comment_id')->nullable()->constrained('comments')->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'post_id'], 'acu_user_post_unique');
        });

        Schema::create('achievement_posting_days', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('posted_on');
            $table->foreignId('source_post_id')->nullable()->constrained('dubbing_posts')->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'posted_on'], 'apd_user_day_unique');
            $table->index(['user_id', 'posted_on'], 'apd_user_day_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('achievement_posting_days');
        Schema::dropIfExists('achievement_comment_uniques');
        Schema::dropIfExists('achievement_feed_items');
        Schema::dropIfExists('user_achievements');
        Schema::dropIfExists('user_achievement_progress');
        Schema::dropIfExists('achievement_levels');
        Schema::dropIfExists('achievement_definitions');
    }
};
