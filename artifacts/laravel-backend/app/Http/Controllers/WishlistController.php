<?php

namespace App\Http\Controllers;

use App\Enums\ProductStatus;
use App\Models\Product;
use App\Services\CatalogQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WishlistController extends Controller
{
    public function index(Request $request, CatalogQuery $catalog): Response
    {
        $products = $request->user()->wishlistItems()->latest()->with([
            'product' => fn ($query) => $query->where('status', ProductStatus::Active)->with([
                'category:id,name,slug', 'brand:id,name,slug', 'images' => fn ($images) => $images->where('is_primary', true),
            ]),
        ])->get()->pluck('product')->filter()->map(fn ($product) => $catalog->card($product))->values();

        return Inertia::render('Account/Wishlist', ['products' => $products]);
    }

    public function store(Request $request, Product $product): RedirectResponse
    {
        abort_unless($product->status === ProductStatus::Active && $product->is_available, 404);
        $request->user()->wishlistItems()->firstOrCreate(['product_id' => $product->id]);

        return back()->with('status', 'wishlist-added');
    }

    public function destroy(Request $request, Product $product): RedirectResponse
    {
        $request->user()->wishlistItems()->where('product_id', $product->id)->delete();

        return back()->with('status', 'wishlist-removed');
    }
}
