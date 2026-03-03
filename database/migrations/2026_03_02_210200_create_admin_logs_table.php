<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logs', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->nullableMorphs('log');
            $table->string('log_name', 191)->nullable();
            $table->string('message', 191);
            $table->string('action', 60);
            $table->json('old_data')->nullable();
            $table->json('new_data')->nullable();
            $table->ipAddress('ip')->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->text('url')->nullable();
            $table->string('method', 20)->nullable();
            $table->timestamps();

            $table->index(['created_at', 'user_id']);
            $table->index('method');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logs');
    }
};
