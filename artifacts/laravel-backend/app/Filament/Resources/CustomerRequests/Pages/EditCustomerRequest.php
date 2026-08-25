<?php

namespace App\Filament\Resources\CustomerRequests\Pages;

use App\Filament\Resources\CustomerRequests\CustomerRequestResource;
use Filament\Resources\Pages\EditRecord;

class EditCustomerRequest extends EditRecord
{
    protected static string $resource = CustomerRequestResource::class;
}
