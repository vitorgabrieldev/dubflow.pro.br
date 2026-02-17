<?php

use App\Http\Controllers\Api\V1\AchievementController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ChatController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DubbingTestController;
use App\Http\Controllers\Api\V1\EditorProjectController;
use App\Http\Controllers\Api\V1\MediaController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\OrganizationController;
use App\Http\Controllers\Api\V1\OrganizationInviteController;
use App\Http\Controllers\Api\V1\OrganizationMemberController;
use App\Http\Controllers\Api\V1\PlaylistController;
use App\Http\Controllers\Api\V1\PostController;
use App\Http\Controllers\Api\V1\PostInteractionController;
use App\Http\Controllers\Api\V1\PublishOptionsController;
use App\Http\Controllers\Api\V1\SearchController;
use App\Http\Controllers\Api\V1\UnifiedSearchController;
use App\Http\Controllers\Api\V1\UserProfileController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/media/{path}', [MediaController::class, 'show'])
        ->where('path', '.*')
        ->name('api.v1.media.show');

    Route::prefix('auth')->middleware('throttle:30,1')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('/reset-password', [AuthController::class, 'resetPassword']);

        Route::middleware('auth:api')->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::post('/refresh', [AuthController::class, 'refresh']);
            Route::patch('/profile', [AuthController::class, 'updateProfile']);
            Route::post('/change-password', [AuthController::class, 'changePassword']);
            Route::get('/account/deletion-preview', [AuthController::class, 'accountDeletionPreview']);
            Route::delete('/account', [AuthController::class, 'deleteAccount']);
        });
    });

    Route::get('/organizations', [OrganizationController::class, 'index']);
    Route::get('/organizations/{organization}', [OrganizationController::class, 'show']);
    Route::get('/organizations/{organization}/dubbing-tests', [DubbingTestController::class, 'organizationTests']);
    Route::get('/playlists', [PlaylistController::class, 'globalIndex']);
    Route::get('/organizations/{organization}/playlists', [PlaylistController::class, 'index']);
    Route::get('/organizations/{organization}/playlists/{playlist}', [PlaylistController::class, 'show']);

    Route::get('/posts', [PostController::class, 'index']);
    Route::get('/posts/{post}', [PostController::class, 'show']);
    Route::get('/users/{user}', [UserProfileController::class, 'show']);
    Route::get('/dubbing-tests/opportunities', [DubbingTestController::class, 'opportunities']);
    Route::get('/dubbing-tests/{dubbingTest}', [DubbingTestController::class, 'show']);

    Route::get('/search', SearchController::class);
    Route::get('/search/unified', UnifiedSearchController::class);

    Route::middleware(['auth:api', 'throttle:120,1'])->group(function () {
        Route::get('/my-organizations', [OrganizationController::class, 'myOrganizations']);
        Route::get('/publish/options', [PublishOptionsController::class, 'index']);
        Route::post('/organizations', [OrganizationController::class, 'store']);
        Route::patch('/organizations/{organization}', [OrganizationController::class, 'update']);
        Route::post('/organizations/{organization}/follow', [OrganizationController::class, 'follow']);
        Route::delete('/organizations/{organization}/follow', [OrganizationController::class, 'unfollow']);
        Route::post('/organizations/{organization}/join-request', [OrganizationController::class, 'requestJoin']);
        Route::get('/organizations/{organization}/invites', [OrganizationInviteController::class, 'index']);
        Route::post('/organizations/{organization}/invites', [OrganizationInviteController::class, 'store']);
        Route::delete('/organizations/{organization}/invites/{invite}', [OrganizationInviteController::class, 'revoke']);
        Route::post('/organizations/invites/{token}/accept', [OrganizationInviteController::class, 'accept']);

        Route::get('/organizations/{organization}/members', [OrganizationMemberController::class, 'index']);
        Route::get('/organizations/{organization}/member-candidates', [OrganizationMemberController::class, 'candidates']);
        Route::post('/organizations/{organization}/members', [OrganizationMemberController::class, 'store']);
        Route::post('/organizations/{organization}/members/accept', [OrganizationMemberController::class, 'accept']);
        Route::post('/organizations/{organization}/members/reject', [OrganizationMemberController::class, 'reject']);
        Route::post('/organizations/{organization}/join-requests/{memberUser}/approve', [OrganizationMemberController::class, 'approveJoinRequest']);
        Route::post('/organizations/{organization}/join-requests/{memberUser}/reject', [OrganizationMemberController::class, 'rejectJoinRequest']);
        Route::post('/organizations/{organization}/owner-transfer', [OrganizationMemberController::class, 'requestOwnerTransfer']);
        Route::post('/organizations/{organization}/owner-transfer/respond', [OrganizationMemberController::class, 'respondOwnerTransfer']);
        Route::delete('/organizations/{organization}/members/{memberUser}/invite', [OrganizationMemberController::class, 'cancelInvite']);
        Route::post('/organizations/{organization}/members/{memberUser}/ban', [OrganizationMemberController::class, 'ban']);
        Route::patch('/organizations/{organization}/members/{memberUser}', [OrganizationMemberController::class, 'update']);
        Route::delete('/organizations/{organization}/members/{memberUser}', [OrganizationMemberController::class, 'destroy']);

        Route::post('/organizations/{organization}/playlists', [PlaylistController::class, 'store']);
        Route::post('/organizations/{organization}/playlists/{playlist}/seasons', [PlaylistController::class, 'createSeason']);
        Route::patch('/organizations/{organization}/playlists/{playlist}', [PlaylistController::class, 'update']);
        Route::delete('/organizations/{organization}/playlists/{playlist}', [PlaylistController::class, 'destroy']);

        Route::post('/organizations/{organization}/posts', [PostController::class, 'store']);
        Route::post('/organizations/{organization}/dubbing-tests', [DubbingTestController::class, 'store']);
        Route::patch('/organizations/{organization}/dubbing-tests/{dubbingTest}', [DubbingTestController::class, 'update']);
        Route::delete('/organizations/{organization}/dubbing-tests/{dubbingTest}', [DubbingTestController::class, 'destroy']);
        Route::get('/organizations/{organization}/dubbing-tests/{dubbingTest}/submissions', [DubbingTestController::class, 'listSubmissions']);
        Route::patch('/organizations/{organization}/dubbing-tests/{dubbingTest}/submissions/{submission}/review', [DubbingTestController::class, 'reviewSubmission']);
        Route::patch('/organizations/{organization}/dubbing-tests/{dubbingTest}/submissions/{submission}/feedback', [DubbingTestController::class, 'saveRejectionFeedback']);
        Route::post('/organizations/{organization}/dubbing-tests/{dubbingTest}/conclude-selection', [DubbingTestController::class, 'concludeSelection']);

        Route::get('/organizations/{organization}/editor-projects', [EditorProjectController::class, 'index']);
        Route::post('/organizations/{organization}/editor-projects', [EditorProjectController::class, 'store']);
        Route::get('/organizations/{organization}/editor-projects/{editorProject}', [EditorProjectController::class, 'show']);
        Route::patch('/organizations/{organization}/editor-projects/{editorProject}', [EditorProjectController::class, 'update']);
        Route::delete('/organizations/{organization}/editor-projects/{editorProject}', [EditorProjectController::class, 'destroy']);
        Route::post('/organizations/{organization}/editor-projects/{editorProject}/autosave', [EditorProjectController::class, 'autosave']);
        Route::post('/organizations/{organization}/editor-projects/{editorProject}/assets', [EditorProjectController::class, 'uploadAssets']);
        Route::delete('/organizations/{organization}/editor-projects/{editorProject}/assets/{asset}', [EditorProjectController::class, 'destroyAsset']);
        Route::post('/organizations/{organization}/editor-projects/{editorProject}/subtitles', [EditorProjectController::class, 'upsertSubtitle']);
        Route::delete('/organizations/{organization}/editor-projects/{editorProject}/subtitles/{subtitle}', [EditorProjectController::class, 'destroySubtitle']);
        Route::get('/organizations/{organization}/editor-projects/{editorProject}/comments', [EditorProjectController::class, 'comments']);
        Route::post('/organizations/{organization}/editor-projects/{editorProject}/comments', [EditorProjectController::class, 'storeComment']);
        Route::delete('/organizations/{organization}/editor-projects/{editorProject}/comments/{comment}', [EditorProjectController::class, 'destroyComment']);
        Route::post('/organizations/{organization}/editor-projects/{editorProject}/renders', [EditorProjectController::class, 'queueRender']);
        Route::get('/organizations/{organization}/editor-projects/{editorProject}/renders', [EditorProjectController::class, 'renders']);
        Route::get('/organizations/{organization}/editor-projects/{editorProject}/renders/{render}', [EditorProjectController::class, 'showRender']);

        Route::post('/dubbing-tests/{dubbingTest}/submissions', [DubbingTestController::class, 'submit']);
        Route::get('/dubbing-tests/{dubbingTest}/my-submissions', [DubbingTestController::class, 'mySubmissions']);

        Route::patch('/posts/{post}', [PostController::class, 'update']);
        Route::delete('/posts/{post}', [PostController::class, 'destroy']);

        Route::post('/posts/{post}/like', [PostInteractionController::class, 'like']);
        Route::delete('/posts/{post}/like', [PostInteractionController::class, 'unlike']);

        Route::post('/posts/{post}/comments', [PostInteractionController::class, 'storeComment']);
        Route::patch('/comments/{comment}', [PostInteractionController::class, 'updateComment']);
        Route::delete('/comments/{comment}', [PostInteractionController::class, 'deleteComment']);

        Route::post('/posts/{post}/view', [PostInteractionController::class, 'recordView']);
        Route::post('/posts/{post}/collaborators', [PostInteractionController::class, 'inviteCollaborator']);
        Route::post('/posts/{post}/collaborators/respond', [PostInteractionController::class, 'respondCollaboration']);

        Route::post('/users/{user}/follow', [UserProfileController::class, 'follow']);
        Route::delete('/users/{user}/follow', [UserProfileController::class, 'unfollow']);

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
        Route::post('/notifications/{notificationId}/invite-accepted', [NotificationController::class, 'markInviteAccepted']);
        Route::post('/notifications/{notificationId}/read', [NotificationController::class, 'markRead']);
        Route::delete('/notifications/clear', [NotificationController::class, 'clearAll']);
        Route::delete('/notifications/{notificationId}', [NotificationController::class, 'destroy']);

        Route::prefix('chat')->group(function () {
            Route::get('/conversations', [ChatController::class, 'conversations']);
            Route::post('/conversations/with/{user}', [ChatController::class, 'startConversation']);
            Route::delete('/conversations/{conversation}', [ChatController::class, 'removeConversation']);
            Route::get('/conversations/{conversation}/messages', [ChatController::class, 'messages']);
            Route::post('/conversations/{conversation}/messages', [ChatController::class, 'sendMessage']);
            Route::post('/conversations/{conversation}/read', [ChatController::class, 'markConversationRead']);
            Route::post('/conversations/{conversation}/typing', [ChatController::class, 'typing']);
            Route::patch('/conversations/{conversation}/peer-alias', [ChatController::class, 'renameConversationPeer']);
            Route::patch('/messages/{message}', [ChatController::class, 'updateMessage']);
            Route::delete('/messages/{message}', [ChatController::class, 'destroyMessage']);
            Route::post('/users/{user}/block', [ChatController::class, 'blockUser']);
            Route::delete('/users/{user}/block', [ChatController::class, 'unblockUser']);
        });

        Route::get('/achievements/me', [AchievementController::class, 'mine']);
        Route::get('/achievements/feed', [AchievementController::class, 'feed']);

        Route::get('/dashboard/overview', [DashboardController::class, 'overview']);
        Route::get('/dashboard/rising-dubbers', [DashboardController::class, 'risingDubbers30Days']);
    });
});
