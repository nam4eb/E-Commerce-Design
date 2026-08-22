<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Enums\ReviewStatus;
use App\Http\Requests\StoreReviewRequest;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;

class ReviewController extends Controller
{
    public function store(StoreReviewRequest $request, Product $product): RedirectResponse
    {
        abort_unless($product->status->value === 'active', 404);
        $user = $request->user();
        $verifiedOrder = $user->orders()
            ->where('status', OrderStatus::Delivered)
            ->whereHas('items', fn ($query) => $query->where('product_id', $product->id))
            ->latest('id')
            ->first();

        $user->reviews()->updateOrCreate(
            ['product_id' => $product->id],
            [
                ...$request->validated(),
                'reviewer_name' => $user->name,
                'reviewer_email' => $user->email,
                'status' => ReviewStatus::Pending,
                'verified_order_id' => $verifiedOrder?->id,
                'verified_at' => $verifiedOrder ? now() : null,
                'approved_at' => null,
            ],
        );

        return back()->with('success', 'Đánh giá đã được gửi và đang chờ kiểm duyệt.');
    }
}
