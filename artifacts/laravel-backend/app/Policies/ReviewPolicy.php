<?php

namespace App\Policies;

use App\Models\User;
use App\Policies\Concerns\AuthorizesAdminDomain;

class ReviewPolicy
{
    use AuthorizesAdminDomain;

    protected function domain(): string
    {
        return 'reviews';
    }

    public function create(User $user): bool
    {
        return false;
    }
}
