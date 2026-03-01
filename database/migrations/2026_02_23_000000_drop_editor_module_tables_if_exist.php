<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop child tables first to avoid foreign key constraint errors.
        Schema::dropIfExists('editor_project_events');
        Schema::dropIfExists('editor_project_renders');
        Schema::dropIfExists('editor_project_comments');
        Schema::dropIfExists('editor_project_subtitles');
        Schema::dropIfExists('editor_project_assets');
        Schema::dropIfExists('editor_projects');
    }

    public function down(): void
    {
        // No-op: the editor module was removed from the codebase.
        // Restoring these tables would require reintroducing the module migration.
    }
};
