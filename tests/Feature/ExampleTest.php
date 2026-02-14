<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_root_route_redirects_to_frontend_locale(): void
    {
        $response = $this->get('/');

        $response->assertStatus(302);
        $location = (string) $response->headers->get('Location');

        $this->assertMatchesRegularExpression(
            '#^http://localhost:3000/(pt-BR|en|es|ja|fr)$#',
            $location
        );
    }
}
