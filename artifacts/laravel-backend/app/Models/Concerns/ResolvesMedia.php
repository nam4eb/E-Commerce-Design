<?php

namespace App\Models\Concerns;

use App\Services\MediaUrl;

trait ResolvesMedia
{
    protected function mediaUrl(?string $value): ?string
    {
        return app(MediaUrl::class)->resolve($value);
    }
}
