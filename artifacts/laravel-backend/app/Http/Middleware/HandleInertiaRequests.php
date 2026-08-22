<?php

namespace App\Http\Middleware;

use App\Services\CartService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'site' => [
                'name' => config('app.name', 'Điện Máy 365'),
                'url' => config('app.url'),
            ],
            'auth' => ['user' => $request->user()?->only([
                'id', 'name', 'email', 'email_verified_at', 'phone', 'role',
            ])],
            'commerce' => [
                'cartCount' => fn () => app(CartService::class)->count($request),
                'wishlistProductIds' => fn () => $request->user()?->wishlistItems()->pluck('product_id')->all() ?? [],
            ],
        ];
    }
}
