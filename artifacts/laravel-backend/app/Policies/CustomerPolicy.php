<?php

namespace App\Policies;

use App\Models\User;
use App\Policies\Concerns\AuthorizesAdminDomain;

class CustomerPolicy
{
    use AuthorizesAdminDomain;

    protected function domain(): string
    {
        return 'customers';
    }

    public function create(User $user): bool
    {
        return $user->hasAdminPermission('users.manage');
    }

    public function update(User $user, mixed $model): bool
    {
        return $user->hasAdminPermission('users.manage') && $user->isNot($model);
    }
}
