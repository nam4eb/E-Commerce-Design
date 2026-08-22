<?php

namespace App\Filament\Resources\Specifications\Pages;

use App\Filament\Resources\Specifications\SpecificationResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditSpecification extends EditRecord
{
    protected static string $resource = SpecificationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
