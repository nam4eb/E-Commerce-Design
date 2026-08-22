<?php

namespace App\Policies;

use App\Models\User;
use App\Policies\Concerns\AuthorizesAdminDomain;

class CommerceRecordPolicy
{
    use AuthorizesAdminDomain;

    protected function domain(): string
    {
        return 'commerce';
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, mixed $model): bool
    {
        return false;
    }
}
