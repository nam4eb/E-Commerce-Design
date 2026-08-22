<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddressRequest;
use App\Models\Address;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class AddressController extends Controller
{
    public function store(AddressRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request) {
            $data = $request->validated();
            if ($request->boolean('is_default') || ! $request->user()->addresses()->exists()) {
                $request->user()->addresses()->update(['is_default' => false]);
                $data['is_default'] = true;
            }
            $request->user()->addresses()->create($data);
        });

        return back()->with('status', 'address-created');
    }

    public function update(AddressRequest $request, Address $address): RedirectResponse
    {
        $this->authorize('update', $address);
        DB::transaction(function () use ($request, $address) {
            $data = $request->validated();
            if ($request->boolean('is_default')) {
                $request->user()->addresses()->whereKeyNot($address->id)->update(['is_default' => false]);
            }
            $address->update($data);
        });

        return back()->with('status', 'address-updated');
    }

    public function destroy(Address $address): RedirectResponse
    {
        $this->authorize('delete', $address);
        DB::transaction(function () use ($address) {
            $wasDefault = $address->is_default;
            $user = $address->user;
            $address->delete();
            if ($wasDefault) {
                $user->addresses()->latest()->first()?->update(['is_default' => true]);
            }
        });

        return back()->with('status', 'address-deleted');
    }
}
