<?php

namespace App\Providers;

use App\Contracts\CustomerNotifier;
use App\Events\OrderPlaced;
use App\Events\OrderStatusChanged;
use App\Listeners\HandleOrderPlaced;
use App\Listeners\NotifyOrderStatusChanged;
use App\Services\MailCustomerNotifier;
use Illuminate\Support\Facades\Event;
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
    }
}
