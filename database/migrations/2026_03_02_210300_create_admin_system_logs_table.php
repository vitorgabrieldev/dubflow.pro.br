<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_logs', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->nullableMorphs('user');
            $table->text('message')->nullable();
            $table->string('level', 20)->default('INFO');
            $table->json('context')->nullable();
            $table->ipAddress('ip')->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->text('url')->nullable();
            $table->string('method', 20)->nullable();
            $table->timestamps();

            $table->index(['level', 'created_at']);
            $table->index('method');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_logs');
    }
};
