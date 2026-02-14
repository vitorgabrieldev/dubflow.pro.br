<?php

namespace App\Support;

use App\Models\DubbingPost;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;

class OrganizationAccess
{
    /**
     * @param array<int, string> $roles
     */
    public static function hasRole(User $user, Organization $organization, array $roles): bool
    {
        return OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->whereIn('role', $roles)
            ->exists();
    }

    public static function isActiveMember(User $user, Organization $organization): bool
    {
        return OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->exists();
    }

    public static function canManageOrganization(User $user, Organization $organization): bool
    {
        return self::hasRole($user, $organization, ['owner', 'admin']);
    }

    public static function canPublish(User $user, Organization $organization): bool
    {
        return self::hasRole($user, $organization, ['owner', 'admin', 'editor']);
    }

    public static function canManagePost(User $user, DubbingPost $post): bool
    {
        if ($post->author_user_id === $user->id) {
            return true;
        }

        return self::canPublish($user, $post->organization);
    }
}
