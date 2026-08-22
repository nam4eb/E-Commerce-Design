<?php

namespace App\Services;

use App\Data\Money;
use App\Data\PricingContext;
use App\Data\PricingResult;
use App\Enums\DiscountType;
use App\Enums\ProductStatus;
use App\Models\Cart;
use App\Models\Coupon;
use App\Models\Promotion;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class PricingService
{
    public function __construct(private readonly SettingsRepository $settings) {}

    public function quote(Cart $cart, PricingContext $context = new PricingContext): PricingResult
    {
        $cart->load(['items.product.category', 'items.product.brand']);
        $items = $cart->items->filter(fn ($item) => $item->product->status === ProductStatus::Active && $item->product->is_available && $item->product->stock >= $item->quantity);
        if ($items->isEmpty()) {
            return new PricingResult([], 0, 0, 0, 0, 0, 0, null, ! $context->shippingCity);
        }
        $promotions = $this->activePromotions($items->pluck('product'));
        $lines = $items->map(function ($item) use ($promotions) {
            $unitPrice = Money::fromDatabase($item->product->currentPrice())->amount;
            $subtotal = $unitPrice * $item->quantity;
            $applicable = $promotions->filter(fn (Promotion $promotion) => $this->promotionApplies($promotion, $item->product));
            $selected = $applicable->where('is_stackable', false)->sortByDesc('priority')->take(1);
            if ($selected->isEmpty()) {
                $selected = $applicable->where('is_stackable', true)->sortByDesc('priority');
            }
            $remaining = $subtotal;
            $applied = [];
            foreach ($selected as $promotion) {
                $discount = $this->discount($remaining, $promotion->type, $promotion->value, $promotion->maximum_discount);
                if ($discount > 0) {
                    $remaining -= $discount;
                    $applied[] = ['id' => $promotion->id, 'name' => $promotion->name, 'amount' => $discount];
                }
            }
            $installationFee = $item->installation_required ? $this->installationFee($item->product) * $item->quantity : 0;

            return [
                'cart_item_id' => $item->id, 'product_id' => $item->product_id, 'sku' => $item->product->sku,
                'quantity' => $item->quantity, 'unit_price' => $unitPrice, 'subtotal' => $subtotal,
                'promotion_discount' => $subtotal - $remaining, 'line_total' => $remaining,
                'installation_required' => $item->installation_required, 'installation_fee' => $installationFee,
                'promotions' => $applied,
            ];
        })->values();
        $subtotal = $lines->sum('subtotal');
        $promotionDiscount = $lines->sum('promotion_discount');
        $discountedSubtotal = $subtotal - $promotionDiscount;
        [$couponDiscount, $couponPayload] = $this->coupon($context, $discountedSubtotal);
        $installationTotal = $lines->sum('installation_fee');
        $shippingTotal = $context->shippingCity ? $this->shippingFee($context->shippingCity, $discountedSubtotal - $couponDiscount) : 0;
        $grandTotal = max(0, $discountedSubtotal - $couponDiscount + $shippingTotal + $installationTotal);

        return new PricingResult($lines->all(), $subtotal, $promotionDiscount, $couponDiscount, $shippingTotal, $installationTotal, $grandTotal, $couponPayload, ! $context->shippingCity);
    }

    private function activePromotions(Collection $products): Collection
    {
        return Promotion::query()->where('is_active', true)
            ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
            ->where(function ($query) use ($products) {
                $query->where(fn ($query) => $query->doesntHave('products')->doesntHave('categories')->doesntHave('brands'))
                    ->orWhereHas('products', fn ($query) => $query->whereIn('products.id', $products->pluck('id')))
                    ->orWhereHas('categories', fn ($query) => $query->whereIn('categories.id', $products->pluck('category_id')))
                    ->orWhereHas('brands', fn ($query) => $query->whereIn('brands.id', $products->pluck('brand_id')));
            })->with(['products:id', 'categories:id', 'brands:id'])->get();
    }

    private function promotionApplies(Promotion $promotion, $product): bool
    {
        $global = $promotion->products->isEmpty() && $promotion->categories->isEmpty() && $promotion->brands->isEmpty();

        return $global || $promotion->products->contains('id', $product->id) || $promotion->categories->contains('id', $product->category_id) || $promotion->brands->contains('id', $product->brand_id);
    }

    private function coupon(PricingContext $context, int $subtotal): array
    {
        $code = strtoupper(trim((string) $context->couponCode));
        if ($code === '') {
            return [0, null];
        }
        $coupon = Coupon::query()->whereRaw('UPPER(code) = ?', [$code])->first();
        if (! $coupon || ! $coupon->is_active || ($coupon->starts_at && $coupon->starts_at->isFuture()) || ($coupon->ends_at && $coupon->ends_at->isPast())) {
            throw ValidationException::withMessages(['coupon_code' => 'Mã giảm giá không hợp lệ hoặc đã hết hạn.']);
        }
        if ($coupon->usage_limit !== null && $coupon->used_count >= $coupon->usage_limit) {
            throw ValidationException::withMessages(['coupon_code' => 'Mã giảm giá đã hết lượt sử dụng.']);
        }
        if ($context->user && $coupon->per_user_limit > 0 && $coupon->redemptions()->where('user_id', $context->user->id)->count() >= $coupon->per_user_limit) {
            throw ValidationException::withMessages(['coupon_code' => 'Bạn đã sử dụng hết lượt của mã này.']);
        }
        if ($subtotal < Money::fromDatabase($coupon->minimum_order)->amount) {
            throw ValidationException::withMessages(['coupon_code' => 'Giỏ hàng chưa đạt giá trị tối thiểu của mã giảm giá.']);
        }
        $discount = $this->discount($subtotal, $coupon->type, $coupon->value, $coupon->maximum_discount);

        return [$discount, ['id' => $coupon->id, 'code' => $coupon->code, 'discount' => $discount]];
    }

    private function discount(int $base, DiscountType $type, string $value, ?string $maximum): int
    {
        $discount = $type === DiscountType::Percentage ? (new Money($base))->percentage($value)->amount : Money::fromDatabase($value)->amount;
        if ($maximum !== null) {
            $discount = min($discount, Money::fromDatabase($maximum)->amount);
        }

        return min($base, max(0, $discount));
    }

    private function shippingFee(string $city, int $subtotal): int
    {
        $settings = $this->settings(['shipping.free_threshold', 'shipping.local_fee', 'shipping.nationwide_fee']);
        if ($subtotal >= $settings['shipping.free_threshold']) {
            return 0;
        }
        $normalized = mb_strtolower(trim($city));
        $local = str_contains($normalized, 'hồ chí minh') || str_contains($normalized, 'ho chi minh') || str_contains($normalized, 'hà nội') || str_contains($normalized, 'ha noi');

        return $local ? $settings['shipping.local_fee'] : $settings['shipping.nationwide_fee'];
    }

    private function installationFee($product): int
    {
        $settings = $this->settings(['installation.aircon.small', 'installation.aircon.medium', 'installation.aircon.large', 'installation.water_heater']);
        if ($product->category->slug === 'dieu-hoa') {
            return match (true) {
                ($product->btu ?? 0) <= 12000 => $settings['installation.aircon.small'],
                ($product->btu ?? 0) <= 18000 => $settings['installation.aircon.medium'],
                default => $settings['installation.aircon.large'],
            };
        }

        return $product->category->slug === 'may-nuoc-nong' ? $settings['installation.water_heater'] : 0;
    }

    private function settings(array $keys): array
    {
        $defaults = config('commerce.pricing');

        return collect($keys)->mapWithKeys(fn ($key) => [
            $key => (int) $this->settings->get($key, $defaults[$key]),
        ])->all();
    }
}
