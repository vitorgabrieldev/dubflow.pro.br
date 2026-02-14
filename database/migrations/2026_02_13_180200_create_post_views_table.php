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
        Schema::create('post_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('dubbing_posts')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('session_fingerprint', 64)->nullable();
            $table->unsignedInteger('watch_seconds')->default(0);
            $table->timestamps();

            $table->index(['post_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['session_fingerprint', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('post_views');
    }
};
