<?php

namespace App\Models;

use App\Enums\InstallationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Installation extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['status' => InstallationStatus::class, 'fee' => 'decimal:2', 'scheduled_at' => 'datetime', 'completed_at' => 'datetime'];
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }
}
