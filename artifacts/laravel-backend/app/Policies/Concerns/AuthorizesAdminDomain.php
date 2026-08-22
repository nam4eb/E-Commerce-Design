<?php

namespace App\Policies\Concerns;

use App\Models\User;

trait AuthorizesAdminDomain
{
    abstract protected function domain(): string;

    public function viewAny(User $user): bool
    {
        return $user->hasAdminPermission($this->domain().'.view');
    }

    public function view(User $user, mixed $model): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->hasAdminPermission($this->domain().'.manage');
    }

    public function update(User $user, mixed $model): bool
    {
        return $this->create($user);
    }

    public function delete(User $user, mixed $model): bool
    {
        return false;
    }

    public function deleteAny(User $user): bool
    {
        return false;
    }

    public function restore(User $user, mixed $model): bool
    {
        return false;
    }

    public function restoreAny(User $user): bool
    {
        return false;
    }

    public function forceDelete(User $user, mixed $model): bool
    {
        return false;
    }

    public function forceDeleteAny(User $user): bool
    {
        return false;
    }
}
