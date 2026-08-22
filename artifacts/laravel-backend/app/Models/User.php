<?php

namespace App\Models;

use App\Enums\AdminRole;
use Database\Factories\UserFactory;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements FilamentUser, MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'role',
        'email_verified_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => AdminRole::class,
        ];
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    public function carts(): HasMany
    {
        return $this->hasMany(Cart::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function wishlistItems(): HasMany
    {
        return $this->hasMany(Wishlist::class);
    }

    public function canAccessPanel(Panel $panel): bool
    {
        return $this->role->isStaff() && $this->hasVerifiedEmail();
    }

    public function hasAdminPermission(string $permission): bool
    {
        if ($this->role === AdminRole::SuperAdmin) {
            return true;
        }

        $permissions = match ($this->role) {
            AdminRole::CatalogEditor => ['catalog.view', 'catalog.manage', 'content.view'],
            AdminRole::ContentEditor => ['catalog.view', 'content.view', 'content.manage', 'reviews.view', 'reviews.manage'],
            AdminRole::OrderOperator => ['catalog.view', 'commerce.view', 'commerce.manage', 'customers.view'],
            AdminRole::Support => ['catalog.view', 'commerce.view', 'customers.view', 'reviews.view'],
            AdminRole::ReadOnly => ['catalog.view', 'content.view', 'commerce.view', 'customers.view', 'reviews.view'],
            default => [],
        };

        return in_array($permission, $permissions, true);
    }
}
