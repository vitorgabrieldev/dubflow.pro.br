<?php

namespace App\Support;

use App\Models\DubbingPost;
use App\Models\OrganizationMember;
use App\Models\User;
use Illuminate\Support\Collection;

class PostViewerPermissions
{
    /**
     * @param Collection<int, DubbingPost> $posts
     */
    public static function attachToCollection(Collection $posts, ?User $viewer): void
    {
        if ($posts->isEmpty()) {
            return;
        }

        if (! $viewer) {
            $posts->each(static function (DubbingPost $post): void {
                $post->setAttribute('viewer_permissions', [
                    'can_edit' => false,
                    'can_delete' => false,
                ]);
            });

            return;
        }

        $organizationIds = $posts
            ->pluck('organization_id')
            ->filter(static fn ($id): bool => is_numeric($id))
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->values()
            ->all();

        $rolesByOrganizationId = OrganizationMember::query()
            ->where('user_id', $viewer->id)
            ->where('status', 'active')
            ->whereIn('organization_id', $organizationIds)
            ->pluck('role', 'organization_id');

        $posts->each(function (DubbingPost $post) use ($viewer, $rolesByOrganizationId): void {
            $metadata = is_array($post->metadata) ? $post->metadata : [];
            $isProfilePost = ($metadata['publish_target'] ?? null) === 'profile';
            $isAuthor = (int) $post->author_user_id === (int) $viewer->id;

            if ($isProfilePost) {
                $post->setAttribute('viewer_permissions', [
                    'can_edit' => $isAuthor,
                    'can_delete' => $isAuthor,
                ]);

                return;
            }

            $role = (string) ($rolesByOrganizationId[(int) $post->organization_id] ?? '');
            $isOwnerOrAdmin = in_array($role, ['owner', 'admin'], true);
            $isEditor = $role === 'editor';

            $canEdit = $isOwnerOrAdmin || ($isEditor && $isAuthor);
            $canDelete = $isOwnerOrAdmin;

            $post->setAttribute('viewer_permissions', [
                'can_edit' => $canEdit,
                'can_delete' => $canDelete,
            ]);
        });
    }
}
