<?php

use App\Http\Controllers\Api\V1\AchievementController;
use App\Http\Controllers\Api\V1\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\V1\Admin\CommentsController as AdminCommentsController;
use App\Http\Controllers\Api\V1\Admin\CommunitiesController as AdminCommunitiesController;
use App\Http\Controllers\Api\V1\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\ExportController as AdminExportController;
use App\Http\Controllers\Api\V1\Admin\LogController as AdminLogController;
use App\Http\Controllers\Api\V1\Admin\NotificationsController as AdminNotificationsController;
use App\Http\Controllers\Api\V1\Admin\OpportunitiesController as AdminOpportunitiesController;
use App\Http\Controllers\Api\V1\Admin\PermissionsController as AdminPermissionsController;
use App\Http\Controllers\Api\V1\Admin\PlatformUsersController as AdminPlatformUsersController;
use App\Http\Controllers\Api\V1\Admin\PostsController as AdminPostsController;
use App\Http\Controllers\Api\V1\Admin\PlaylistsController as AdminPlaylistsController;
use App\Http\Controllers\Api\V1\Admin\RolesController as AdminRolesController;
use App\Http\Controllers\Api\V1\Admin\SystemLogController as AdminSystemLogController;
use App\Http\Controllers\Api\V1\Admin\UsersController as AdminUsersController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ChatController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DubbingTestController;
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
    Route::prefix('admin')->group(function () {
        Route::get('/exports/{file}', [AdminExportController::class, 'download'])
            ->middleware(['auth:api', 'signed'])
            ->name('api.v1.admin.exports.download');

        Route::prefix('auth')->middleware('throttle:30,1')->group(function () {
            Route::post('/login', [AdminAuthController::class, 'login']);
            Route::post('/password/recovery', [AdminAuthController::class, 'passwordRecovery']);
        });

        Route::middleware('auth:api')->group(function () {
            Route::get('/dashboard', [AdminDashboardController::class, 'index'])
                ->middleware('permission:users.list,roles.list,log.list,system-log.list,platform-users.list,communities.list,posts.list,playlists.list,opportunities.list,comments.list,notifications.list');

            Route::delete('/auth/logout', [AdminAuthController::class, 'logout']);
            Route::get('/auth/user', [AdminAuthController::class, 'show']);
            Route::post('/auth/change-password', [AdminAuthController::class, 'changePassword']);
            Route::post('/auth/change-avatar', [AdminAuthController::class, 'changeAvatar']);

            Route::get('/logs', [AdminLogController::class, 'index'])->middleware('permission:log.list');
            Route::get('/logs/export', [AdminLogController::class, 'export'])->middleware('permission:log.export');
            Route::get('/logs/{logUuid}', [AdminLogController::class, 'show'])->middleware('permission:log.show');

            Route::get('/permissions/autocomplete', [AdminPermissionsController::class, 'autocomplete'])
                ->middleware('permission:roles.list,roles.show,roles.create,roles.edit');

            Route::get('/roles', [AdminRolesController::class, 'index'])->middleware('permission:roles.list');
            Route::post('/roles', [AdminRolesController::class, 'store'])->middleware('permission:roles.create');
            Route::get('/roles/autocomplete', [AdminRolesController::class, 'autocomplete'])
                ->middleware('permission:roles.list,roles.show,users.list,users.show,users.create,users.edit');
            Route::get('/roles/export', [AdminRolesController::class, 'export'])->middleware('permission:roles.export');
            Route::get('/roles/{roleUuid}', [AdminRolesController::class, 'show'])->middleware('permission:roles.show');
            Route::post('/roles/{roleUuid}', [AdminRolesController::class, 'update'])->middleware('permission:roles.edit');
            Route::delete('/roles/{roleUuid}', [AdminRolesController::class, 'destroy'])->middleware('permission:roles.delete');

            Route::get('/system-log', [AdminSystemLogController::class, 'index'])->middleware('permission:system-log.list');
            Route::get('/system-log/export', [AdminSystemLogController::class, 'export'])->middleware('permission:system-log.export');
            Route::get('/system-log/{logUuid}', [AdminSystemLogController::class, 'show'])->middleware('permission:system-log.show');

            Route::get('/users', [AdminUsersController::class, 'index'])->middleware('permission:users.list');
            Route::post('/users', [AdminUsersController::class, 'store'])->middleware('permission:users.create');
            Route::get('/users/autocomplete', [AdminUsersController::class, 'autocomplete'])
                ->middleware('permission:users.list,users.show,users.create,users.edit');
            Route::get('/users/export', [AdminUsersController::class, 'export'])->middleware('permission:users.export');
            Route::get('/users/{userUuid}', [AdminUsersController::class, 'show'])->middleware('permission:users.show');
            Route::post('/users/{userUuid}', [AdminUsersController::class, 'update'])->middleware('permission:users.edit');
            Route::delete('/users/{userUuid}', [AdminUsersController::class, 'destroy'])->middleware('permission:users.delete');

            Route::get('/platform-users', [AdminPlatformUsersController::class, 'index'])->middleware('permission:platform-users.list');
            Route::post('/platform-users', [AdminPlatformUsersController::class, 'store'])->middleware('permission:platform-users.create');
            Route::get('/platform-users/autocomplete', [AdminPlatformUsersController::class, 'autocomplete'])
                ->middleware('permission:platform-users.list,platform-users.show,platform-users.create,platform-users.edit');
            Route::get('/platform-users/export', [AdminPlatformUsersController::class, 'export'])->middleware('permission:platform-users.export');
            Route::get('/platform-users/{userUuid}', [AdminPlatformUsersController::class, 'show'])->middleware('permission:platform-users.show');
            Route::post('/platform-users/{userUuid}', [AdminPlatformUsersController::class, 'update'])->middleware('permission:platform-users.edit');
            Route::delete('/platform-users/{userUuid}', [AdminPlatformUsersController::class, 'destroy'])->middleware('permission:platform-users.delete');
            Route::delete('/platform-users/{userUuid}/permanent', [AdminPlatformUsersController::class, 'destroyPermanent'])->middleware('permission:platform-users.delete');

            Route::get('/communities', [AdminCommunitiesController::class, 'index'])->middleware('permission:communities.list');
            Route::post('/communities', [AdminCommunitiesController::class, 'store'])->middleware('permission:communities.create');
            Route::get('/communities/autocomplete', [AdminCommunitiesController::class, 'autocomplete'])
                ->middleware('permission:communities.list,communities.show,communities.create,communities.edit');
            Route::get('/communities/export', [AdminCommunitiesController::class, 'export'])->middleware('permission:communities.export');
            Route::get('/communities/{communityId}', [AdminCommunitiesController::class, 'show'])->middleware('permission:communities.show');
            Route::post('/communities/{communityId}', [AdminCommunitiesController::class, 'update'])->middleware('permission:communities.edit');
            Route::delete('/communities/{communityId}', [AdminCommunitiesController::class, 'destroy'])->middleware('permission:communities.delete');
            Route::post('/communities/{communityId}/restore', [AdminCommunitiesController::class, 'restore'])->middleware('permission:communities.delete');
            Route::get('/communities/{communityId}/followers', [AdminCommunitiesController::class, 'followers'])->middleware('permission:communities.show');
            Route::post('/communities/{communityId}/followers', [AdminCommunitiesController::class, 'addFollower'])->middleware('permission:communities.edit');
            Route::post('/communities/{communityId}/followers/{userUuid}/status', [AdminCommunitiesController::class, 'updateFollowerStatus'])->middleware('permission:communities.edit');
            Route::delete('/communities/{communityId}/followers/{userUuid}', [AdminCommunitiesController::class, 'removeFollower'])->middleware('permission:communities.edit');
            Route::get('/communities/{communityId}/episode-filters', [AdminCommunitiesController::class, 'episodeFilters'])->middleware('permission:communities.show');
            Route::get('/communities/{communityId}/episodes', [AdminCommunitiesController::class, 'episodes'])->middleware('permission:communities.show');
            Route::post('/communities/{communityId}/episodes/{episodeId}/status', [AdminCommunitiesController::class, 'updateEpisodeStatus'])->middleware('permission:communities.edit');
            Route::get('/communities/{communityId}/collaborators', [AdminCommunitiesController::class, 'collaborators'])->middleware('permission:communities.show');
            Route::post('/communities/{communityId}/collaborators/{userUuid}', [AdminCommunitiesController::class, 'updateCollaborator'])->middleware('permission:communities.edit');
            Route::delete('/communities/{communityId}/collaborators/{userUuid}', [AdminCommunitiesController::class, 'removeCollaborator'])->middleware('permission:communities.edit');

            Route::get('/playlists', [AdminPlaylistsController::class, 'index'])->middleware('permission:playlists.list');
            Route::post('/playlists', [AdminPlaylistsController::class, 'store'])->middleware('permission:playlists.create');
            Route::get('/playlists/autocomplete', [AdminPlaylistsController::class, 'autocomplete'])
                ->middleware('permission:playlists.list,playlists.show,playlists.create,playlists.edit');
            Route::get('/playlists/export', [AdminPlaylistsController::class, 'export'])->middleware('permission:playlists.export');
            Route::get('/playlists/{playlistId}', [AdminPlaylistsController::class, 'show'])->middleware('permission:playlists.show');
            Route::post('/playlists/{playlistId}', [AdminPlaylistsController::class, 'update'])->middleware('permission:playlists.edit');
            Route::delete('/playlists/{playlistId}', [AdminPlaylistsController::class, 'destroy'])->middleware('permission:playlists.delete');

            Route::get('/posts', [AdminPostsController::class, 'index'])->middleware('permission:posts.list');
            Route::get('/posts/{postId}', [AdminPostsController::class, 'show'])->middleware('permission:posts.show');

            Route::get('/opportunities', [AdminOpportunitiesController::class, 'index'])->middleware('permission:opportunities.list');
            Route::post('/opportunities', [AdminOpportunitiesController::class, 'store'])->middleware('permission:opportunities.create');
            Route::get('/opportunities/autocomplete', [AdminOpportunitiesController::class, 'autocomplete'])
                ->middleware('permission:opportunities.list,opportunities.show,opportunities.create,opportunities.edit');
            Route::get('/opportunities/export', [AdminOpportunitiesController::class, 'export'])->middleware('permission:opportunities.export');
            Route::get('/opportunities/{opportunityId}', [AdminOpportunitiesController::class, 'show'])->middleware('permission:opportunities.show');
            Route::post('/opportunities/{opportunityId}', [AdminOpportunitiesController::class, 'update'])->middleware('permission:opportunities.edit');
            Route::delete('/opportunities/{opportunityId}', [AdminOpportunitiesController::class, 'destroy'])->middleware('permission:opportunities.delete');

            Route::get('/comments', [AdminCommentsController::class, 'index'])->middleware('permission:comments.list');
            Route::post('/comments', [AdminCommentsController::class, 'store'])->middleware('permission:comments.create');
            Route::get('/comments/autocomplete', [AdminCommentsController::class, 'autocomplete'])
                ->middleware('permission:comments.list,comments.show,comments.create,comments.edit');
            Route::get('/comments/posts/autocomplete', [AdminCommentsController::class, 'postsAutocomplete'])
                ->middleware('permission:comments.list,comments.show,comments.create,comments.edit');
            Route::get('/comments/export', [AdminCommentsController::class, 'export'])->middleware('permission:comments.export');
            Route::get('/comments/{commentId}', [AdminCommentsController::class, 'show'])->middleware('permission:comments.show');
            Route::post('/comments/{commentId}', [AdminCommentsController::class, 'update'])->middleware('permission:comments.edit');
            Route::delete('/comments/{commentId}', [AdminCommentsController::class, 'destroy'])->middleware('permission:comments.delete');

            Route::get('/notifications', [AdminNotificationsController::class, 'index'])->middleware('permission:notifications.list');
            Route::post('/notifications', [AdminNotificationsController::class, 'store'])->middleware('permission:notifications.create');
            Route::get('/notifications/autocomplete', [AdminNotificationsController::class, 'autocomplete'])
                ->middleware('permission:notifications.list,notifications.show,notifications.create,notifications.edit');
            Route::get('/notifications/export', [AdminNotificationsController::class, 'export'])->middleware('permission:notifications.export');
            Route::get('/notifications/{notificationId}', [AdminNotificationsController::class, 'show'])->middleware('permission:notifications.show');
            Route::post('/notifications/{notificationId}', [AdminNotificationsController::class, 'update'])->middleware('permission:notifications.edit');
            Route::delete('/notifications/{notificationId}', [AdminNotificationsController::class, 'destroy'])->middleware('permission:notifications.delete');
        });
    });

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
        Route::delete('/organizations/{organization}/leave', [OrganizationController::class, 'leave']);
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

        Route::post('/posts/profile', [PostController::class, 'storeProfile']);
        Route::post('/organizations/{organization}/posts', [PostController::class, 'store']);
        Route::post('/organizations/{organization}/dubbing-tests', [DubbingTestController::class, 'store']);
        Route::patch('/organizations/{organization}/dubbing-tests/{dubbingTest}', [DubbingTestController::class, 'update']);
        Route::delete('/organizations/{organization}/dubbing-tests/{dubbingTest}', [DubbingTestController::class, 'destroy']);
        Route::get('/organizations/{organization}/dubbing-tests/{dubbingTest}/submissions', [DubbingTestController::class, 'listSubmissions']);
        Route::patch('/organizations/{organization}/dubbing-tests/{dubbingTest}/submissions/{submission}/review', [DubbingTestController::class, 'reviewSubmission']);
        Route::patch('/organizations/{organization}/dubbing-tests/{dubbingTest}/submissions/{submission}/feedback', [DubbingTestController::class, 'saveRejectionFeedback']);
        Route::post('/organizations/{organization}/dubbing-tests/{dubbingTest}/conclude-selection', [DubbingTestController::class, 'concludeSelection']);

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
