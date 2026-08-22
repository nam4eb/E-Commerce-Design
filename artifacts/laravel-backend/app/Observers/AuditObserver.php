<?php

namespace App\Observers;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

class AuditObserver
{
    private const REDACTED = '[REDACTED]';

    private const SENSITIVE_KEYS = [
        'password', 'remember_token', 'token', 'secret', 'payload', 'provider_payload',
    ];

    public function created(Model $model): void
    {
        $this->record($model, 'created', [], $model->getAttributes());
    }

    public function updated(Model $model): void
    {
        $changes = $model->getChanges();
        unset($changes['updated_at']);
        if ($changes === []) {
            return;
        }

        $old = array_intersect_key($model->getOriginal(), $changes);
        $this->record($model, 'updated', $old, $changes);
    }

    public function deleted(Model $model): void
    {
        $this->record($model, 'deleted', $model->getAttributes(), []);
    }

    public function restored(Model $model): void
    {
        $this->record($model, 'restored', [], $model->getAttributes());
    }

    private function record(Model $model, string $event, array $old, array $new): void
    {
        AuditLog::query()->create([
            'actor_id' => auth()->id(),
            'event' => $event,
            'auditable_type' => $model->getMorphClass(),
            'auditable_id' => $model->getKey(),
            'old_values' => $this->sanitize($old),
            'new_values' => $this->sanitize($new),
            'ip_address' => request()?->ip(),
            'user_agent' => mb_substr((string) request()?->userAgent(), 0, 500) ?: null,
            'metadata' => ['route' => request()?->route()?->getName()],
        ]);
    }

    private function sanitize(array $values): array
    {
        unset($values['created_at'], $values['updated_at']);
        foreach ($values as $key => &$value) {
            if (in_array(strtolower((string) $key), self::SENSITIVE_KEYS, true) || str_contains(strtolower((string) $key), 'secret')) {
                $value = self::REDACTED;
            }
        }

        return $values;
    }
}
