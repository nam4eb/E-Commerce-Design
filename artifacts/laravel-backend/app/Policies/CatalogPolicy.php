<?php

namespace App\Policies;

use App\Policies\Concerns\AuthorizesAdminDomain;

class CatalogPolicy
{
    use AuthorizesAdminDomain;

    protected function domain(): string
    {
        return 'catalog';
    }
}
