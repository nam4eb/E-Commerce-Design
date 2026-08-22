<?php

namespace App\Models;

use App\Enums\ShipmentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Shipment extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['status' => ShipmentStatus::class, 'payload' => 'array', 'shipped_at' => 'datetime', 'delivered_at' => 'datetime', 'provider_synced_at' => 'datetime'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
