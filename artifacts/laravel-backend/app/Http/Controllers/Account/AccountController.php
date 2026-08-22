<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Account/Index', [
            'profile' => $user->only(['name', 'email', 'phone', 'email_verified_at']),
            'addresses' => $user->addresses()->latest('is_default')->latest()->get(),
            'summary' => ['orders' => $user->orders()->count(), 'wishlist' => $user->wishlistItems()->count()],
            'status' => session('status'),
        ]);
    }
}
