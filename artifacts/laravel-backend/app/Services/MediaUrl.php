<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;

class MediaUrl
{
    public function resolve(?string $path): ?string
    {
        if (blank($path) || str_starts_with($path, 'http://') || str_starts_with($path, 'https://') || str_starts_with($path, '/')) {
            return $path;
        }

        return Storage::disk(config('media.disk'))->url($path);
    }
}
