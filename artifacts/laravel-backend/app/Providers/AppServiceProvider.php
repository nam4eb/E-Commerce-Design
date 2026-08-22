<?php

namespace App\Providers;

use App\Contracts\CustomerNotifier;
use App\Events\OrderPlaced;
use App\Events\OrderStatusChanged;
use App\Listeners\HandleOrderPlaced;
use App\Listeners\NotifyOrderStatusChanged;
use App\Models\Address;
use App\Models\Article;
use App\Models\AuditLog;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Installation;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Promotion;
use App\Models\Review;
use App\Models\Setting;
use App\Models\Shipment;
use App\Models\Specification;
use App\Models\User;
use App\Observers\AuditObserver;
use App\Policies\AddressPolicy;
use App\Policies\CatalogPolicy;
use App\Policies\CommerceRecordPolicy;
use App\Policies\ContentPolicy;
use App\Policies\CustomerPolicy;
use App\Policies\ReviewPolicy;
use App\Services\MailCustomerNotifier;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(CustomerNotifier::class, MailCustomerNotifier::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(OrderPlaced::class, HandleOrderPlaced::class);
        Event::listen(OrderStatusChanged::class, NotifyOrderStatusChanged::class);
        Event::listen(Login::class, function (Login $event): void {
            if ($event->user instanceof User && $event->user->role?->isStaff() === true) {
                $this->recordAdminAuthentication($event->user, 'admin_login');
            }
        });
        Event::listen(Logout::class, function (Logout $event): void {
            if ($event->user instanceof User && $event->user->role?->isStaff() === true) {
                $this->recordAdminAuthentication($event->user, 'admin_logout');
            }
        });

        foreach ([Product::class, Category::class, Brand::class, ProductImage::class, Specification::class, Promotion::class, Coupon::class, Setting::class] as $model) {
            Gate::policy($model, CatalogPolicy::class);
        }
        Gate::policy(Article::class, ContentPolicy::class);
        foreach ([Order::class, Payment::class, Shipment::class, Installation::class] as $model) {
            Gate::policy($model, CommerceRecordPolicy::class);
        }
        Gate::policy(User::class, CustomerPolicy::class);
        Gate::policy(Address::class, AddressPolicy::class);
        Gate::policy(Review::class, ReviewPolicy::class);

        foreach ([Product::class, Category::class, Brand::class, Article::class, Promotion::class, Coupon::class, Setting::class, Order::class, Payment::class, Shipment::class, Installation::class, Review::class, User::class] as $model) {
            $model::observe(AuditObserver::class);
        }
    }

    private function recordAdminAuthentication(User $user, string $event): void
    {
        AuditLog::query()->create([
            'actor_id' => $user->id,
            'event' => $event,
            'ip_address' => request()->ip(),
            'user_agent' => mb_substr((string) request()->userAgent(), 0, 500) ?: null,
            'metadata' => ['route' => request()->route()?->getName()],
        ]);
    }
}
