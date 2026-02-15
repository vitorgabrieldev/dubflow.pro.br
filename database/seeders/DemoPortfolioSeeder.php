<?php

namespace Database\Seeders;

use App\Models\Comment;
use App\Models\DubbingPost;
use App\Models\Organization;
use App\Models\OrganizationFollow;
use App\Models\OrganizationMember;
use App\Models\Playlist;
use App\Models\PostCollaborator;
use App\Models\PostCredit;
use App\Models\PostLike;
use App\Models\PostView;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class DemoPortfolioSeeder extends Seeder
{
    public function run(): void
    {
        $faker = fake('pt_BR');

        $this->truncateTables();

        $users = $this->seedUsers($faker);
        $tags = $this->seedTags();
        [$organizations, , $posts] = $this->seedOrganizationsAndPosts($users, $tags, $faker);

        $this->seedEngagement($posts, $users, $faker);

        foreach ($organizations as $organization) {
            $organization->recalculateVerification();
        }
    }

    private function truncateTables(): void
    {
        Schema::disableForeignKeyConstraints();

        foreach ([
            'achievement_processed_events',
            'achievement_feed_items',
            'user_achievements',
            'user_achievement_progress',
            'achievement_posting_days',
            'achievement_comment_uniques',
            'achievement_levels',
            'achievement_definitions',
            'post_views',
            'dubbing_post_tag',
            'tags',
            'comments',
            'post_likes',
            'post_credits',
            'post_collaborators',
            'dubbing_posts',
            'playlists',
            'organization_follows',
            'organization_members',
            'organizations',
            'notifications',
            'users',
            'sessions',
            'password_reset_tokens',
        ] as $table) {
            DB::table($table)->truncate();
        }

        Schema::enableForeignKeyConstraints();
    }

    /**
     * @return \Illuminate\Support\Collection<int, User>
     */
    private function seedUsers($faker)
    {
        $baseUsers = [
            ['name' => 'Vitor Gabriel', 'email' => 'admin@dubflow.dev', 'stage_name' => 'Vitor Sensei'],
            ['name' => 'Ana Paula', 'email' => 'ana@dubflow.dev', 'stage_name' => 'Ana Voz'],
            ['name' => 'Rafael Costa', 'email' => 'rafael@dubflow.dev', 'stage_name' => 'Rafa Vox'],
            ['name' => 'Luiza Martins', 'email' => 'luiza@dubflow.dev', 'stage_name' => 'Lu Dubladora'],
            ['name' => 'Carlos Neri', 'email' => 'carlos@dubflow.dev', 'stage_name' => 'Neri Voice'],
            ['name' => 'Marina Melo', 'email' => 'marina@dubflow.dev', 'stage_name' => 'Marina Melo'],
            ['name' => 'Joao Neves', 'email' => 'joao@dubflow.dev', 'stage_name' => 'Jo Neves'],
            ['name' => 'Beatriz Rocha', 'email' => 'beatriz@dubflow.dev', 'stage_name' => 'Bia Rocha'],
            ['name' => 'Igor Lins', 'email' => 'igor@dubflow.dev', 'stage_name' => 'Lins Studio'],
            ['name' => 'Tamires Souza', 'email' => 'tamires@dubflow.dev', 'stage_name' => 'Tammy VA'],
            ['name' => 'Bruno Sato', 'email' => 'bruno@dubflow.dev', 'stage_name' => 'Sato Dub'],
            ['name' => 'Kelly Reis', 'email' => 'kelly@dubflow.dev', 'stage_name' => 'Kelly Voice'],
        ];

        $rows = [];
        $locales = ['pt-BR', 'en', 'es', 'ja', 'fr'];
        $passwordHash = Hash::make('password123');
        $now = now();

        foreach ($baseUsers as $index => $userData) {
            $rows[] = [
                'name' => $userData['name'],
                'username' => 'demo'.($index + 1),
                'stage_name' => $userData['stage_name'],
                'bio' => 'Dublador(a) focado(a) em series, filmes e anime.',
                'avatar_path' => 'https://i.pravatar.cc/300?img='.($index + 3),
                'cover_path' => 'https://picsum.photos/seed/user-cover-'.($index + 1).'/1200/360',
                'website_url' => 'https://dubflow.dev/perfil/demo'.($index + 1),
                'locale' => $locales[$index % count($locales)],
                'email' => $userData['email'],
                'email_verified_at' => $now,
                'password' => $passwordHash,
                'is_private' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        for ($i = 13; $i <= 30; $i++) {
            $rows[] = [
                'name' => $faker->name(),
                'username' => 'membro'.$i,
                'stage_name' => 'Voice '.$i,
                'bio' => $faker->sentence(12),
                'avatar_path' => 'https://i.pravatar.cc/300?img='.(($i % 69) + 1),
                'cover_path' => 'https://picsum.photos/seed/user-cover-'.$i.'/1200/360',
                'website_url' => 'https://dubflow.dev/perfil/membro'.$i,
                'locale' => $locales[array_rand($locales)],
                'email' => 'membro'.$i.'@dubflow.dev',
                'email_verified_at' => $now,
                'password' => $passwordHash,
                'is_private' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('users')->insert($rows);

        return User::query()->orderBy('id')->get();
    }

    /**
     * @return \Illuminate\Support\Collection<int, Tag>
     */
    private function seedTags()
    {
        $tagNames = [
            'anime',
            'serie',
            'filme',
            'acao',
            'aventura',
            'comedia',
            'drama',
            'fantasia',
            'ficcao-cientifica',
            'romance',
            'terror',
            'narracao',
            'trailer',
            'game',
            'voice-over',
            'pt-br',
            'ingles',
            'espanhol',
            'japones',
            'frances',
        ];

        return collect($tagNames)->map(fn ($name) => Tag::create([
            'name' => Str::headline($name),
            'slug' => Str::slug($name),
        ]));
    }

    /**
     * @param \Illuminate\Support\Collection<int, User> $users
     * @param \Illuminate\Support\Collection<int, Tag> $tags
     * @return array{0:\Illuminate\Support\Collection<int, Organization>,1:array<int,\Illuminate\Support\Collection<int, Playlist>>,2:\Illuminate\Support\Collection<int, DubbingPost>}
     */
    private function seedOrganizationsAndPosts($users, $tags, $faker): array
    {
        $organizationBlueprints = [
            ['name' => 'Konoha Voice Collective', 'work' => 'Naruto Shippuden'],
            ['name' => 'Saiyajin Dub House', 'work' => 'Dragon Ball Z'],
            ['name' => 'Pirate Dub Crew', 'work' => 'One Piece'],
            ['name' => 'Titan Voice Lab', 'work' => 'Attack on Titan'],
            ['name' => 'Alchemy Sound Union', 'work' => 'Fullmetal Alchemist'],
            ['name' => 'Mystic Studio BR', 'work' => 'Jujutsu Kaisen'],
            ['name' => 'Hero Academy Dubbers', 'work' => 'My Hero Academia'],
            ['name' => 'Cinema Voz Brasil', 'work' => 'Longa-Metragem Original'],
        ];

        $organizations = collect();
        $organizationPlaylists = [];
        $posts = collect();

        foreach ($organizationBlueprints as $index => $blueprint) {
            $owner = $users[$index];
            $slug = Str::slug($blueprint['name']);

            $organization = Organization::create([
                'owner_user_id' => $owner->id,
                'name' => $blueprint['name'],
                'slug' => $slug,
                'description' => 'Comunidade focada em dublagens de '.$blueprint['work'].' e derivados.',
                'avatar_path' => 'https://picsum.photos/seed/org-avatar-'.($index + 1).'/320/320',
                'cover_path' => 'https://picsum.photos/seed/org-cover-'.($index + 1).'/1400/420',
                'website_url' => 'https://dubflow.dev/comunidades/'.$slug,
                'is_public' => true,
                'settings' => [
                    'languages' => ['pt-BR', 'en', 'es', 'ja', 'fr'],
                ],
            ]);

            $organizations->push($organization);

            OrganizationMember::create([
                'organization_id' => $organization->id,
                'user_id' => $owner->id,
                'role' => 'owner',
                'status' => 'active',
                'joined_at' => now()->subMonths(6),
            ]);

            $memberCount = $index === 0 ? 8 : random_int(4, 6);
            $memberCandidates = $users->where('id', '!=', $owner->id)->shuffle()->take($memberCount)->values();

            foreach ($memberCandidates as $memberIndex => $member) {
                $role = match (true) {
                    $memberIndex < 2 => 'admin',
                    $memberIndex < 6 => 'editor',
                    default => 'member',
                };

                OrganizationMember::firstOrCreate([
                    'organization_id' => $organization->id,
                    'user_id' => $member->id,
                ], [
                    'role' => $role,
                    'status' => 'active',
                    'joined_at' => now()->subDays(random_int(10, 350)),
                    'invited_by_user_id' => $owner->id,
                ]);
            }

            $followersCount = $index === 0 ? 20 : random_int(5, 12);
            $followers = $users->shuffle()->take($followersCount);

            foreach ($followers as $follower) {
                OrganizationFollow::firstOrCreate([
                    'organization_id' => $organization->id,
                    'user_id' => $follower->id,
                ]);
            }

            $playlistCount = $index === 0 ? 4 : random_int(2, 3);
            $organizationPlaylists[$organization->id] = collect();

            for ($playlistIndex = 1; $playlistIndex <= $playlistCount; $playlistIndex++) {
                $title = $blueprint['work'].' - Temporada '.random_int(1, 6).' (Parte '.$playlistIndex.')';

                $playlist = Playlist::create([
                    'organization_id' => $organization->id,
                    'title' => $title,
                    'slug' => Str::slug($title).'-'.$playlistIndex,
                    'description' => 'Colecao de episodios dublados da obra '.$blueprint['work'].'.',
                    'work_title' => $blueprint['work'],
                    'season_number' => random_int(1, 8),
                    'release_year' => random_int(1998, 2025),
                    'cover_path' => 'https://picsum.photos/seed/playlist-'.$organization->id.'-'.$playlistIndex.'/1000/560',
                    'visibility' => random_int(1, 100) <= 85 ? 'public' : 'unlisted',
                ]);

                $organizationPlaylists[$organization->id]->push($playlist);
            }

            $postCount = [10, 7, 7, 6, 6, 5, 4, 5][$index] ?? 5;
            $memberIds = OrganizationMember::query()
                ->where('organization_id', $organization->id)
                ->where('status', 'active')
                ->pluck('user_id')
                ->values();
            $memberStageNames = User::query()
                ->whereIn('id', $memberIds)
                ->pluck('stage_name', 'id');

            for ($postIndex = 1; $postIndex <= $postCount; $postIndex++) {
                $hasPlaylist = random_int(1, 100) <= 74;
                $playlist = $hasPlaylist ? $organizationPlaylists[$organization->id]->random() : null;
                $authorId = $memberIds->random();
                $mediaType = random_int(1, 100) <= 68 ? 'video' : 'audio';
                $durationSeconds = $mediaType === 'video' ? random_int(120, 3600) : random_int(45, 2400);
                $hasCollaborators = random_int(1, 100) <= 22;
                $requiresApproval = $hasCollaborators && random_int(1, 100) <= 44;

                $post = DubbingPost::create([
                    'organization_id' => $organization->id,
                    'playlist_id' => $playlist?->id,
                    'author_user_id' => $authorId,
                    'title' => $blueprint['work'].' - Episodio '.$postIndex,
                    'description' => $faker->sentence(20),
                    'media_path' => $mediaType === 'video'
                        ? 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4'
                        : 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3',
                    'media_type' => $mediaType,
                    'media_size_bytes' => random_int(2_000_000, 760_000_000),
                    'thumbnail_path' => 'https://picsum.photos/seed/post-thumb-'.$organization->id.'-'.$postIndex.'/1200/675',
                    'duration_seconds' => $durationSeconds,
                    'visibility' => $requiresApproval ? 'private' : (random_int(1, 100) <= 82 ? 'public' : 'unlisted'),
                    'allow_comments' => random_int(1, 100) <= 88,
                    'language_code' => ['pt-BR', 'en', 'es', 'ja', 'fr'][array_rand(['pt-BR', 'en', 'es', 'ja', 'fr'])],
                    'content_license' => ['all_rights_reserved', 'allow_reshare_with_credit', 'allow_remix_with_credit'][array_rand(['all_rights_reserved', 'allow_reshare_with_credit', 'allow_remix_with_credit'])],
                    'published_at' => $requiresApproval ? null : now()->subDays(random_int(0, 200))->subMinutes(random_int(0, 1439)),
                    'metadata' => [
                        'work_title' => $playlist?->work_title ?? $blueprint['work'],
                        'requires_collaborator_approval' => $hasCollaborators,
                    ],
                ]);

                $posts->push($post);

                $postTagIds = $tags->shuffle()->take(random_int(2, 5))->pluck('id')->all();
                $post->tags()->sync($postTagIds);

                $creditCount = random_int(1, 3);
                for ($creditIndex = 1; $creditIndex <= $creditCount; $creditIndex++) {
                    $dubberId = $memberIds->random();

                    PostCredit::create([
                        'post_id' => $post->id,
                        'character_name' => 'Personagem '.$creditIndex,
                        'dubber_user_id' => $dubberId,
                        'dubber_name' => $memberStageNames[$dubberId] ?? null,
                        'display_order' => $creditIndex,
                    ]);
                }

                if ($hasCollaborators) {
                    $collaboratorCount = random_int(1, min(4, max(1, $memberIds->count() - 1)));
                    $collaboratorIds = $memberIds->filter(fn ($id) => $id !== $authorId)->shuffle()->take($collaboratorCount)->values();

                    foreach ($collaboratorIds as $collabIndex => $collaboratorId) {
                        $status = $requiresApproval
                            ? ($collabIndex === 0 ? 'pending' : (random_int(1, 100) <= 45 ? 'pending' : 'accepted'))
                            : 'accepted';

                        PostCollaborator::create([
                            'post_id' => $post->id,
                            'user_id' => $collaboratorId,
                            'invited_by_user_id' => $authorId,
                            'status' => $status,
                            'responded_at' => $status === 'pending' ? null : now()->subDays(random_int(0, 30)),
                        ]);
                    }
                }
            }
        }

        return [$organizations, $organizationPlaylists, $posts];
    }

    /**
     * @param \Illuminate\Support\Collection<int, DubbingPost> $posts
     * @param \Illuminate\Support\Collection<int, User> $users
     */
    private function seedEngagement($posts, $users, $faker): void
    {
        foreach ($posts as $post) {
            $likesCount = $post->visibility === 'public' ? random_int(1, 6) : random_int(0, 2);
            $likeUsers = $users->shuffle()->take(min($likesCount, $users->count()));

            foreach ($likeUsers as $likeUser) {
                PostLike::firstOrCreate([
                    'post_id' => $post->id,
                    'user_id' => $likeUser->id,
                ]);
            }

            if ($post->allow_comments) {
                $commentCount = $post->visibility === 'public' ? random_int(0, 3) : random_int(0, 1);

                for ($commentIndex = 1; $commentIndex <= $commentCount; $commentIndex++) {
                    $commentAuthor = $users->random();

                    $comment = Comment::create([
                        'post_id' => $post->id,
                        'user_id' => $commentAuthor->id,
                        'body' => $faker->sentence(random_int(6, 16)),
                    ]);

                    if (random_int(1, 100) <= 16) {
                        Comment::create([
                            'post_id' => $post->id,
                            'user_id' => $users->random()->id,
                            'parent_id' => $comment->id,
                            'body' => $faker->sentence(random_int(4, 12)),
                        ]);
                    }
                }
            }

            $viewsCount = $post->visibility === 'public' ? random_int(2, 7) : random_int(0, 3);

            for ($viewIndex = 1; $viewIndex <= $viewsCount; $viewIndex++) {
                $viewer = random_int(1, 100) <= 72 ? $users->random() : null;

                PostView::create([
                    'post_id' => $post->id,
                    'user_id' => $viewer?->id,
                    'session_fingerprint' => hash('sha256', 'post-'.$post->id.'-view-'.$viewIndex.'-'.Str::uuid()),
                    'watch_seconds' => random_int(5, max(10, min(3600, $post->duration_seconds))),
                ]);
            }
        }
    }
}
