<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('pronouns', 40)->nullable()->after('stage_name');
            $table->json('dubbing_languages')->nullable()->after('skills');
            $table->json('voice_accents')->nullable()->after('dubbing_languages');
            $table->boolean('has_recording_equipment')->default(false)->after('voice_accents');
            $table->json('recording_equipment')->nullable()->after('has_recording_equipment');
            $table->string('recording_equipment_other', 255)->nullable()->after('recording_equipment');
            $table->json('weekly_availability')->nullable()->after('recording_equipment_other');
            $table->string('state', 80)->nullable()->after('weekly_availability');
            $table->string('city', 120)->nullable()->after('state');
            $table->json('proposal_contact_preferences')->nullable()->after('city');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'pronouns',
                'dubbing_languages',
                'voice_accents',
                'has_recording_equipment',
                'recording_equipment',
                'recording_equipment_other',
                'weekly_availability',
                'state',
                'city',
                'proposal_contact_preferences',
            ]);
        });
    }
};
