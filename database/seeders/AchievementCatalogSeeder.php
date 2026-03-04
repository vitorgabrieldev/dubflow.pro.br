<?php

namespace Database\Seeders;

use App\Models\AchievementDefinition;
use App\Models\AchievementLevel;
use Illuminate\Database\Seeder;

class AchievementCatalogSeeder extends Seeder
{
    /**
     * @var array<string, array{0: string, 1: string}>
     */
    private const RARITY_COLORS = [
        'common' => ['#64748B', '#94A3B8'],
        'uncommon' => ['#2563EB', '#3B82F6'],
        'rare' => ['#7C3AED', '#A855F7'],
        'epic' => ['#C026D3', '#E879F9'],
        'legendary' => ['#EA580C', '#F59E0B'],
        'mythic' => ['#E11D48', '#EC4899'],
    ];

    public function run(): void
    {
        foreach ($this->catalog() as $index => $item) {
            $definitionRarity = $item['definition_rarity'] ?? 'common';
            [$definitionColorStart, $definitionColorEnd] = $this->resolveColors($definitionRarity);

            $definition = AchievementDefinition::query()->updateOrCreate(
                ['slug' => $item['slug']],
                [
                    'title' => $item['title'],
                    'description' => $item['description'],
                    'category' => $item['category'],
                    'metric_key' => $item['metric_key'],
                    'rarity' => $definitionRarity,
                    'icon' => $item['icon'],
                    'color_start' => $definitionColorStart,
                    'color_end' => $definitionColorEnd,
                    'display_order' => $index + 1,
                    'valid_for_days' => null,
                    'is_active' => true,
                    'is_hidden' => false,
                    'metadata' => [
                        'scope' => 'global',
                    ],
                ]
            );

            foreach ($item['levels'] as $levelIndex => $threshold) {
                $level = $levelIndex + 1;
                $levelRarity = $item['level_rarities'][$levelIndex] ?? $definitionRarity;
                [$colorStart, $colorEnd] = $this->resolveColors($levelRarity);

                AchievementLevel::query()->updateOrCreate(
                    [
                        'achievement_definition_id' => $definition->id,
                        'level' => $level,
                    ],
                    [
                        'threshold' => $threshold,
                        'title' => sprintf('%s - Nível %d', $item['title'], $level),
                        'description' => sprintf('Alcance %d em "%s".', $threshold, $item['title']),
                        'rarity' => $levelRarity,
                        'icon' => $item['icon'],
                        'color_start' => $colorStart,
                        'color_end' => $colorEnd,
                        'valid_for_days' => null,
                        'display_order' => $level,
                        'metadata' => [
                            'scope' => 'global',
                        ],
                    ]
                );
            }
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function catalog(): array
    {
        return [
            [
                'slug' => 'cena-aberta',
                'title' => 'Cena Aberta',
                'description' => 'Publicou episódio novo e já abriu os trabalhos.',
                'category' => 'episodios',
                'metric_key' => 'episodes_launched_total',
                'icon' => 'clapperboard',
                'definition_rarity' => 'uncommon',
                'level_rarities' => ['common', 'rare', 'epic'],
                'levels' => [1, 3, 6],
            ],
            [
                'slug' => 'voz-na-area',
                'title' => 'Voz na Área',
                'description' => 'Seu estúdio começou a ganhar ritmo de lançamento.',
                'category' => 'episodios',
                'metric_key' => 'episodes_launched_total',
                'icon' => 'mic-2',
                'definition_rarity' => 'uncommon',
                'level_rarities' => ['common', 'rare', 'epic'],
                'levels' => [2, 5, 10],
            ],
            [
                'slug' => 'sem-corte',
                'title' => 'Sem Corte',
                'description' => 'Seu catálogo segue firme e sem pausa.',
                'category' => 'episodios',
                'metric_key' => 'episodes_launched_total',
                'icon' => 'scissors-line-dashed',
                'definition_rarity' => 'rare',
                'level_rarities' => ['uncommon', 'rare', 'epic'],
                'levels' => [3, 8, 15],
            ],
            [
                'slug' => 'binge-do-estudio',
                'title' => 'Binge do Estúdio',
                'description' => 'Quem acompanha sua comunidade maratona sem medo.',
                'category' => 'episodios',
                'metric_key' => 'episodes_launched_total',
                'icon' => 'tv',
                'definition_rarity' => 'rare',
                'level_rarities' => ['uncommon', 'rare', 'epic'],
                'levels' => [5, 12, 25],
            ],
            [
                'slug' => 'catalogo-em-expansao',
                'title' => 'Catálogo em Expansão',
                'description' => 'Uma sequência de episódios deixou sua marca.',
                'category' => 'episodios',
                'metric_key' => 'episodes_launched_total',
                'icon' => 'library',
                'definition_rarity' => 'epic',
                'level_rarities' => ['rare', 'epic', 'legendary'],
                'levels' => [8, 20, 40],
            ],
            [
                'slug' => 'maratona-de-episodios',
                'title' => 'Maratona de Episódios',
                'description' => 'Produção longa com fôlego de protagonista.',
                'category' => 'episodios',
                'metric_key' => 'episodes_launched_total',
                'icon' => 'timer',
                'definition_rarity' => 'epic',
                'level_rarities' => ['rare', 'epic', 'legendary'],
                'levels' => [12, 30, 60],
            ],
            [
                'slug' => 'temporada-turbo',
                'title' => 'Temporada Turbo',
                'description' => 'Sua equipe entrou em modo temporada completa.',
                'category' => 'episodios',
                'metric_key' => 'episodes_launched_total',
                'icon' => 'rocket',
                'definition_rarity' => 'legendary',
                'level_rarities' => ['rare', 'epic', 'legendary'],
                'levels' => [18, 45, 90],
            ],
            [
                'slug' => 'lenda-do-lancamento',
                'title' => 'Lenda do Lançamento',
                'description' => 'Poucos chegam aqui: publicação em alto nível.',
                'category' => 'episodios',
                'metric_key' => 'episodes_launched_total',
                'icon' => 'crown',
                'definition_rarity' => 'mythic',
                'level_rarities' => ['epic', 'legendary', 'mythic'],
                'levels' => [25, 60, 120],
            ],
            [
                'slug' => 'falou-ta-falado',
                'title' => 'Falou, Tá Falado',
                'description' => 'Comentário em episódio também vale palco.',
                'category' => 'comentarios',
                'metric_key' => 'episode_comments_unique_total',
                'icon' => 'message-circle',
                'definition_rarity' => 'common',
                'level_rarities' => ['common', 'uncommon', 'rare'],
                'levels' => [1, 5, 12],
            ],
            [
                'slug' => 'bate-papo-de-set',
                'title' => 'Bate-papo de Set',
                'description' => 'Interagiu em episódios diferentes com consistência.',
                'category' => 'comentarios',
                'metric_key' => 'episode_comments_unique_total',
                'icon' => 'messages-square',
                'definition_rarity' => 'uncommon',
                'level_rarities' => ['common', 'rare', 'epic'],
                'levels' => [2, 8, 20],
            ],
            [
                'slug' => 'comentarista-de-plantao',
                'title' => 'Comentarista de Plantão',
                'description' => 'Sempre aparece para fortalecer a comunidade.',
                'category' => 'comentarios',
                'metric_key' => 'episode_comments_unique_total',
                'icon' => 'megaphone',
                'definition_rarity' => 'rare',
                'level_rarities' => ['uncommon', 'rare', 'epic'],
                'levels' => [4, 12, 30],
            ],
            [
                'slug' => 'eco-nos-comentarios',
                'title' => 'Eco nos Comentários',
                'description' => 'Sua presença no feedback é constante.',
                'category' => 'comentarios',
                'metric_key' => 'episode_comments_unique_total',
                'icon' => 'audio-lines',
                'definition_rarity' => 'rare',
                'level_rarities' => ['uncommon', 'rare', 'epic'],
                'levels' => [6, 18, 45],
            ],
            [
                'slug' => 'voz-da-plateia',
                'title' => 'Voz da Plateia',
                'description' => 'Comentou em vários episódios diferentes e virou referência.',
                'category' => 'comentarios',
                'metric_key' => 'episode_comments_unique_total',
                'icon' => 'mic-vocal',
                'definition_rarity' => 'epic',
                'level_rarities' => ['rare', 'epic', 'legendary'],
                'levels' => [10, 25, 60],
            ],
            [
                'slug' => 'primeiro-aplauso',
                'title' => 'Primeiro Aplauso',
                'description' => 'Seu episódio começou a receber curtidas.',
                'category' => 'curtidas',
                'metric_key' => 'episode_likes_received_total',
                'icon' => 'thumbs-up',
                'definition_rarity' => 'common',
                'level_rarities' => ['common', 'uncommon', 'rare'],
                'levels' => [1, 10, 30],
            ],
            [
                'slug' => 'eco-de-aplausos',
                'title' => 'Eco de Aplausos',
                'description' => 'As curtidas começaram a chegar com força.',
                'category' => 'curtidas',
                'metric_key' => 'episode_likes_received_total',
                'icon' => 'sparkles',
                'definition_rarity' => 'uncommon',
                'level_rarities' => ['common', 'rare', 'epic'],
                'levels' => [5, 25, 70],
            ],
            [
                'slug' => 'aplausometro-subindo',
                'title' => 'Aplausômetro Subindo',
                'description' => 'O público já está acompanhando seus lançamentos.',
                'category' => 'curtidas',
                'metric_key' => 'episode_likes_received_total',
                'icon' => 'bar-chart-3',
                'definition_rarity' => 'rare',
                'level_rarities' => ['uncommon', 'rare', 'epic'],
                'levels' => [12, 40, 100],
            ],
            [
                'slug' => 'chuva-de-likes',
                'title' => 'Chuva de Likes',
                'description' => 'Seu trabalho começou a viralizar entre as comunidades.',
                'category' => 'curtidas',
                'metric_key' => 'episode_likes_received_total',
                'icon' => 'cloud-rain',
                'definition_rarity' => 'epic',
                'level_rarities' => ['rare', 'epic', 'legendary'],
                'levels' => [20, 70, 150],
            ],
            [
                'slug' => 'idolo-da-timeline',
                'title' => 'Ídolo da Timeline',
                'description' => 'Curtidas em série, alcance em alta.',
                'category' => 'curtidas',
                'metric_key' => 'episode_likes_received_total',
                'icon' => 'star',
                'definition_rarity' => 'legendary',
                'level_rarities' => ['epic', 'legendary', 'mythic'],
                'levels' => [35, 100, 220],
            ],
            [
                'slug' => 'ritmo-de-estudio',
                'title' => 'Ritmo de Estúdio',
                'description' => 'Manteve dias ativos de postagem no mês.',
                'category' => 'consistencia',
                'metric_key' => 'posting_days_30d',
                'icon' => 'calendar-clock',
                'definition_rarity' => 'uncommon',
                'level_rarities' => ['common', 'rare', 'epic'],
                'levels' => [3, 7, 12],
            ],
            [
                'slug' => 'sem-pular-semana',
                'title' => 'Sem Pular Semana',
                'description' => 'Constância semanal com episódios novos.',
                'category' => 'consistencia',
                'metric_key' => 'posting_days_30d',
                'icon' => 'calendar-check',
                'definition_rarity' => 'rare',
                'level_rarities' => ['uncommon', 'rare', 'epic'],
                'levels' => [4, 10, 15],
            ],
            [
                'slug' => 'calendario-em-dia',
                'title' => 'Calendário em Dia',
                'description' => 'Postagem recorrente com disciplina.',
                'category' => 'consistencia',
                'metric_key' => 'posting_days_30d',
                'icon' => 'calendar-days',
                'definition_rarity' => 'rare',
                'level_rarities' => ['uncommon', 'rare', 'epic'],
                'levels' => [5, 12, 18],
            ],
            [
                'slug' => 'constancia-ninja',
                'title' => 'Constância Ninja',
                'description' => 'Postou em muitos dias diferentes no mês.',
                'category' => 'consistencia',
                'metric_key' => 'posting_days_30d',
                'icon' => 'swords',
                'definition_rarity' => 'epic',
                'level_rarities' => ['rare', 'epic', 'legendary'],
                'levels' => [7, 15, 22],
            ],
            [
                'slug' => 'relogio-de-publicacao',
                'title' => 'Relógio de Publicação',
                'description' => 'Seu mês virou referência de regularidade.',
                'category' => 'consistencia',
                'metric_key' => 'posting_days_30d',
                'icon' => 'alarm-clock',
                'definition_rarity' => 'legendary',
                'level_rarities' => ['epic', 'legendary', 'mythic'],
                'levels' => [10, 18, 26],
            ],
            [
                'slug' => 'primeiro-teste',
                'title' => 'Primeiro Teste',
                'description' => 'Primeira inscrição enviada para um personagem.',
                'category' => 'inscricoes',
                'metric_key' => 'role_submissions_total',
                'icon' => 'file-audio',
                'definition_rarity' => 'common',
                'level_rarities' => ['common', 'uncommon', 'rare'],
                'levels' => [1, 4, 10],
            ],
            [
                'slug' => 'caca-papeis',
                'title' => 'Caça-Papéis',
                'description' => 'Participou de várias seleções de voz.',
                'category' => 'inscricoes',
                'metric_key' => 'role_submissions_total',
                'icon' => 'search-check',
                'definition_rarity' => 'uncommon',
                'level_rarities' => ['common', 'rare', 'epic'],
                'levels' => [2, 7, 16],
            ],
            [
                'slug' => 'voz-em-toda-selecao',
                'title' => 'Voz em Toda Seleção',
                'description' => 'Mostrou presença forte nos testes.',
                'category' => 'inscricoes',
                'metric_key' => 'role_submissions_total',
                'icon' => 'radio-tower',
                'definition_rarity' => 'rare',
                'level_rarities' => ['uncommon', 'rare', 'epic'],
                'levels' => [4, 12, 28],
            ],
            [
                'slug' => 'piloto-de-audicao',
                'title' => 'Piloto de Audição',
                'description' => 'Acumulou muitas inscrições e manteve o ritmo.',
                'category' => 'inscricoes',
                'metric_key' => 'role_submissions_total',
                'icon' => 'send',
                'definition_rarity' => 'epic',
                'level_rarities' => ['rare', 'epic', 'legendary'],
                'levels' => [6, 16, 36],
            ],
            [
                'slug' => 'abriu-os-testes',
                'title' => 'Abriu os Testes',
                'description' => 'Criou oportunidade de dublagem na comunidade.',
                'category' => 'criacao',
                'metric_key' => 'tests_created_total',
                'icon' => 'megaphone',
                'definition_rarity' => 'uncommon',
                'level_rarities' => ['common', 'rare', 'epic'],
                'levels' => [1, 3, 6],
            ],
            [
                'slug' => 'diretor-de-casting',
                'title' => 'Diretor de Casting',
                'description' => 'Criou várias oportunidades para novos talentos.',
                'category' => 'criacao',
                'metric_key' => 'tests_created_total',
                'icon' => 'users-round',
                'definition_rarity' => 'rare',
                'level_rarities' => ['uncommon', 'rare', 'legendary'],
                'levels' => [2, 5, 10],
            ],
            [
                'slug' => 'fabrica-de-oportunidades',
                'title' => 'Fábrica de Oportunidades',
                'description' => 'Seu estúdio virou referência em testes de dublagem.',
                'category' => 'criacao',
                'metric_key' => 'tests_created_total',
                'icon' => 'factory',
                'definition_rarity' => 'legendary',
                'level_rarities' => ['epic', 'legendary', 'mythic'],
                'levels' => [3, 7, 15],
            ],
        ];
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function resolveColors(string $rarity): array
    {
        return self::RARITY_COLORS[$rarity] ?? self::RARITY_COLORS['common'];
    }
}
