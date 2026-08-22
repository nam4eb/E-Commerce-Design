<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class OrderItem extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['product_snapshot' => 'array', 'unit_price' => 'decimal:2', 'discount_total' => 'decimal:2', 'line_total' => 'decimal:2', 'installation_required' => 'boolean', 'installation_fee' => 'decimal:2'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function installation(): HasOne
    {
        return $this->hasOne(Installation::class);
    }
}
