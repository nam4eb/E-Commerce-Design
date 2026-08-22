<?php

namespace App\Data;

final readonly class Money
{
    public function __construct(public int $amount, public string $currency = 'VND')
    {
        if ($amount < 0) {
            throw new \InvalidArgumentException('Money cannot be negative.');
        }
    }

    public static function fromDatabase(string|int|float|null $value): self
    {
        return new self((int) round((float) ($value ?? 0), 0, PHP_ROUND_HALF_UP));
    }

    public function percentage(string|int|float $percent): self
    {
        return new self((int) round($this->amount * (float) $percent / 100, 0, PHP_ROUND_HALF_UP), $this->currency);
    }
}
