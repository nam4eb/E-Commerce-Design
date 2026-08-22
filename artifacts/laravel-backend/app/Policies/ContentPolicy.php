<?php

namespace App\Policies;

use App\Policies\Concerns\AuthorizesAdminDomain;

class ContentPolicy
{
    use AuthorizesAdminDomain;

    protected function domain(): string
    {
        return 'content';
    }
}
