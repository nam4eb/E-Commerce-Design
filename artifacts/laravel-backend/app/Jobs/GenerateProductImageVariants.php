<?php

namespace App\Jobs;

use App\Models\ProductImage;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Throwable;

class GenerateProductImageVariants implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public readonly int $productImageId) {}

    public function handle(): void
    {
        if (! function_exists('imagewebp')) {
            throw new \RuntimeException('GD WebP support is required to generate product image variants.');
        }

        $image = ProductImage::find($this->productImageId);
        $path = $image?->getRawOriginal('url');
        if (! $image || ! is_string($path) || preg_match('#^https?://#i', $path)) {
            return;
        }

        $disk = Storage::disk(config('media.disk'));
        if (! $disk->exists($path)) {
            return;
        }

        $contents = $disk->get($path);
        $source = @imagecreatefromstring($contents);
        if ($source === false) {
            return;
        }

        try {
            $width = imagesx($source);
            $height = imagesy($source);
            $variants = [];
            foreach (config('media.variant_widths') as $targetWidth) {
                if ($targetWidth >= $width) {
                    continue;
                }
                $targetHeight = max(1, (int) round($height * ($targetWidth / $width)));
                $resized = imagecreatetruecolor($targetWidth, $targetHeight);
                imagealphablending($resized, false);
                imagesavealpha($resized, true);
                imagecopyresampled($resized, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);
                ob_start();
                imagewebp($resized, null, 82);
                $webp = ob_get_clean();
                imagedestroy($resized);
                $variantPath = pathinfo($path, PATHINFO_DIRNAME).'/variants/'.pathinfo($path, PATHINFO_FILENAME)."-{$targetWidth}.webp";
                $disk->put($variantPath, $webp, ['visibility' => 'public', 'ContentType' => 'image/webp']);
                $variants[(string) $targetWidth] = $variantPath;
            }

            $image->updateQuietly([
                'variants' => $variants,
                'mime_type' => (new \finfo(FILEINFO_MIME_TYPE))->buffer($contents),
                'width' => $width,
                'height' => $height,
                'file_size' => strlen($contents),
            ]);
        } catch (Throwable $exception) {
            report($exception);
            throw $exception;
        } finally {
            imagedestroy($source);
        }
    }
}
