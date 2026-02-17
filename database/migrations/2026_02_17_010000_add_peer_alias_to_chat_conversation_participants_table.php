<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_conversation_participants', function (Blueprint $table): void {
            $table->string('peer_alias', 80)->nullable()->after('last_seen_at');
        });
    }

    public function down(): void
    {
        Schema::table('chat_conversation_participants', function (Blueprint $table): void {
            $table->dropColumn('peer_alias');
        });
    }
};
