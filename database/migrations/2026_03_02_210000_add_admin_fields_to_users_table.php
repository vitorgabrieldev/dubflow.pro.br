<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'uuid')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->uuid('uuid')->nullable()->unique()->after('id');
            });

            DB::table('users')
                ->whereNull('uuid')
                ->orderBy('id')
                ->chunkById(200, function ($users): void {
                    foreach ($users as $user) {
                        DB::table('users')
                            ->where('id', $user->id)
                            ->update(['uuid' => (string) Str::uuid()]);
                    }
                });
        }

        if (! Schema::hasColumn('users', 'is_active')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->boolean('is_active')->default(true)->after('password');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'is_active')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn('is_active');
            });
        }

        if (Schema::hasColumn('users', 'uuid')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropUnique('users_uuid_unique');
                $table->dropColumn('uuid');
            });
        }
    }
};
