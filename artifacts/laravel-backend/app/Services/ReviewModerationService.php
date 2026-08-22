<?php

namespace App\Services;

use App\Enums\ReviewStatus;
use App\Models\Review;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReviewModerationService
{
    public function moderate(Review $review, ReviewStatus $target): Review
    {
        if (! in_array($target, [ReviewStatus::Approved, ReviewStatus::Rejected], true)) {
            throw ValidationException::withMessages(['status' => 'Chỉ có thể duyệt hoặc từ chối đánh giá.']);
        }

        return DB::transaction(function () use ($review, $target) {
            $review = Review::query()->lockForUpdate()->findOrFail($review->id);
            $review->update([
                'status' => $target,
                'approved_at' => $target === ReviewStatus::Approved ? now() : null,
            ]);

            return $review->fresh();
        }, 3);
    }
}
