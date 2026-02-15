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
        Schema::create('achievement_processed_events', function (Blueprint $table): void {
            $table->id();
            $table->string('event_key', 190)->unique();
            $table->string('event_type', 80)->index();
            $table->unsignedBigInteger('resource_id')->nullable()->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('processed_at');
            $table->timestamps();

            $table->index(['event_type', 'resource_id'], 'ape_event_resource_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('achievement_processed_events');
    }
};
