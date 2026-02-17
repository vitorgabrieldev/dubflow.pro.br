<?php

use App\Models\EditorProject;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('chat.user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

Broadcast::channel('editor.project.{projectId}', function ($user, $projectId) {
    return EditorProject::query()
        ->where('id', (int) $projectId)
        ->where('owner_user_id', (int) $user->id)
        ->exists();
});
