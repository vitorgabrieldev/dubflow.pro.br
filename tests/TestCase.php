<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        $appEnv = (string) (getenv('APP_ENV') ?: ($_ENV['APP_ENV'] ?? ''));
        $database = (string) (getenv('DB_DATABASE') ?: ($_ENV['DB_DATABASE'] ?? ''));

        if ($appEnv !== 'testing') {
            throw new RuntimeException(
                'APP_ENV inválido para testes. Esperado: testing.'
            );
        }

        if ($database !== 'studiodublagem_tests') {
            throw new RuntimeException(
                'DB_DATABASE inválido para testes. Esperado: studiodublagem_tests.'
            );
        }

        $cachedConfigPath = dirname(__DIR__).'/bootstrap/cache/config.php';
        if (is_file($cachedConfigPath)) {
            throw new RuntimeException(
                'Config cache ativo detectado em bootstrap/cache/config.php. '.
                'Execute "php artisan config:clear" antes de rodar os testes para evitar atingir o banco principal.'
            );
        }

        parent::setUp();
    }
}
