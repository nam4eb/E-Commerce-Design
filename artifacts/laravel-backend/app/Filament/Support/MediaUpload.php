<?php

namespace App\Filament\Support;

use Filament\Forms\Components\FileUpload;

final class MediaUpload
{
    public static function image(string $name, string $directory): FileUpload
    {
        return FileUpload::make($name)
            ->disk(config('media.disk'))
            ->directory($directory)
            ->visibility('public')
            ->acceptedFileTypes(config('media.mime_types'))
            ->maxSize(config('media.max_upload_kb'))
            ->image()
            ->imageEditor();
    }
}
