<?php

namespace App\Services;

use App\Enums\InstallationStatus;
use App\Models\Installation;
use Carbon\CarbonInterface;
use Illuminate\Validation\ValidationException;

class InstallationSchedulingService
{
    public function schedule(Installation $installation, CarbonInterface $at): Installation
    {
        if ($at->isPast() || ! in_array($installation->status, [InstallationStatus::Pending, InstallationStatus::Scheduled], true)) {
            throw ValidationException::withMessages(['scheduled_at' => 'Lịch lắp đặt không hợp lệ.']);
        }
        $installation->update(['status' => InstallationStatus::Scheduled, 'scheduled_at' => $at]);

        return $installation->fresh();
    }

    public function transition(Installation $installation, InstallationStatus $target): Installation
    {
        $allowed = [
            'pending' => ['scheduled', 'cancelled', 'failed'],
            'scheduled' => ['in_progress', 'cancelled', 'failed'],
            'in_progress' => ['completed', 'failed'],
            'completed' => [], 'cancelled' => [], 'failed' => [],
        ];
        if (! in_array($target->value, $allowed[$installation->status->value], true)) {
            throw ValidationException::withMessages(['status' => 'Installation status transition không hợp lệ.']);
        }
        $installation->update(['status' => $target, 'completed_at' => $target === InstallationStatus::Completed ? now() : null]);

        return $installation->fresh();
    }
}
