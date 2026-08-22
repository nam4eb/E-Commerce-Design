<?php

namespace App\Models;

use App\Jobs\GenerateProductImageVariants;
use App\Models\Concerns\ResolvesMedia;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductImage extends Model
{
    use ResolvesMedia;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['variants' => 'array', 'is_primary' => 'boolean'];
    }

    protected function url(): Attribute
    {
        return Attribute::get(fn (?string $value) => $this->mediaUrl($value));
    }

    protected static function booted(): void
    {
        static::saved(function (ProductImage $image): void {
            $path = $image->getRawOriginal('url');
            if ($image->wasChanged('url') && is_string($path) && ! preg_match('#^https?://#i', $path)) {
                GenerateProductImageVariants::dispatch($image->id)->afterCommit();
            }
        });
    }

    public function variantUrls(): array
    {
        return collect($this->variants ?? [])->map(fn (string $path) => $this->mediaUrl($path))->all();
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
