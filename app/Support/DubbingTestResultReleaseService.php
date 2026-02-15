<?php

namespace App\Support;

class DubbingTestResultReleaseService
{
    public function releaseDue(): int
    {
        // Fluxo automático desativado: resultados só são liberados manualmente
        // via endpoint "concludeSelection" na revisão de inscrições.
        return 0;
    }
}
