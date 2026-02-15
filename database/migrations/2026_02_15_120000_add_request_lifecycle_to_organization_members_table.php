<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('organization_members', function (Blueprint $table) {
            $table->string('source', 40)->default('invite')->after('status');
            $table->foreignId('requested_by_user_id')->nullable()->after('invited_by_user_id')->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by_user_id')->nullable()->after('requested_by_user_id')->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable()->after('joined_at');
            $table->index(['organization_id', 'status', 'source'], 'org_members_org_status_source_idx');
        });

        DB::table('organization_members')
            ->where('status', 'pending')
            ->whereNull('invited_by_user_id')
            ->update([
                'source' => 'join_request',
                'requested_by_user_id' => DB::raw('user_id'),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organization_members', function (Blueprint $table) {
            $table->dropIndex('org_members_org_status_source_idx');
            $table->dropConstrainedForeignId('approved_by_user_id');
            $table->dropConstrainedForeignId('requested_by_user_id');
            $table->dropColumn(['source', 'approved_at']);
        });
    }
};
