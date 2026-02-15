<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Support\DubbingTestResultReleaseService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('dubbing-tests:release-results', function (DubbingTestResultReleaseService $releaseService) {
    $releasedCount = $releaseService->releaseDue();

    $this->info('Fluxo automático desativado. Resultados liberados apenas manualmente. Total processado: '.$releasedCount);
})->purpose('Comando legado (fluxo automático desativado).');
