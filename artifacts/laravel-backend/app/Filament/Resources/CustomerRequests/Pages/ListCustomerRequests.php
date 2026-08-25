<?php

namespace App\Filament\Resources\CustomerRequests\Pages;

use App\Filament\Resources\CustomerRequests\CustomerRequestResource;
use Filament\Resources\Pages\ListRecords;

class ListCustomerRequests extends ListRecords
{
    protected static string $resource = CustomerRequestResource::class;
}
