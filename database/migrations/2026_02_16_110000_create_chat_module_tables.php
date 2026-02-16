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
        Schema::create('chat_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_one_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('user_two_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('last_message_id')->nullable();
            $table->timestamps();

            $table->unique(['user_one_id', 'user_two_id']);
            $table->index(['user_one_id', 'updated_at']);
            $table->index(['user_two_id', 'updated_at']);
        });

        Schema::create('chat_conversation_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('chat_conversations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('last_read_message_id')->nullable();
            $table->timestamp('hidden_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();

            $table->unique(['conversation_id', 'user_id']);
            $table->index(['user_id', 'hidden_at']);
        });

        Schema::create('chat_user_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blocker_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('blocked_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['blocker_user_id', 'blocked_user_id']);
            $table->index(['blocked_user_id', 'blocker_user_id']);
        });

        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('chat_conversations')->cascadeOnDelete();
            $table->foreignId('sender_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('recipient_user_id')->constrained('users')->cascadeOnDelete();
            $table->text('body')->nullable();
            $table->timestamp('edited_at')->nullable();
            $table->timestamp('deleted_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['conversation_id', 'id']);
            $table->index(['recipient_user_id', 'delivered_at']);
            $table->index(['recipient_user_id', 'read_at']);
        });

        Schema::create('chat_message_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('chat_messages')->cascadeOnDelete();
            $table->string('media_path');
            $table->enum('media_type', ['audio', 'video', 'image', 'file'])->default('file');
            $table->string('mime')->nullable();
            $table->string('original_name')->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->timestamps();

            $table->index(['message_id', 'media_type']);
        });

        Schema::table('chat_conversations', function (Blueprint $table) {
            $table->foreign('last_message_id')
                ->references('id')
                ->on('chat_messages')
                ->nullOnDelete();
        });

        Schema::table('chat_conversation_participants', function (Blueprint $table) {
            $table->foreign('last_read_message_id')
                ->references('id')
                ->on('chat_messages')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_message_attachments');
        Schema::dropIfExists('chat_conversation_participants');
        Schema::dropIfExists('chat_conversations');
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_user_blocks');
    }
};
