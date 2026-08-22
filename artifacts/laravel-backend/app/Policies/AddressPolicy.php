<?php

namespace App\Policies;

use App\Models\Address;
use App\Models\User;

class AddressPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAdminPermission('customers.view');
    }

    public function view(User $user, Address $address): bool
    {
        return $address->user_id === $user->id || $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Address $address): bool
    {
        return $address->user_id === $user->id;
    }

    public function delete(User $user, Address $address): bool
    {
        return $address->user_id === $user->id;
    }

    public function deleteAny(User $user): bool
    {
        return false;
    }

    public function restore(User $user, Address $address): bool
    {
        return false;
    }

    public function forceDelete(User $user, Address $address): bool
    {
        return false;
    }
}
