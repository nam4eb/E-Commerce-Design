<?php

namespace App\Enums;

enum AdminRole: string
{
    case Customer = 'customer';
    case SuperAdmin = 'admin';
    case CatalogEditor = 'catalog_editor';
    case ContentEditor = 'content_editor';
    case OrderOperator = 'order_operator';
    case Support = 'support';
    case ReadOnly = 'read_only';

    public function isStaff(): bool
    {
        return $this !== self::Customer;
    }
}
