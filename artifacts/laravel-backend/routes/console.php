<?php

use App\Enums\CartStatus;
use App\Models\Cart;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\WebhookEvent;
use App\Services\SettingsRepository;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('commerce:expire-promotions', function () {
    $count = Promotion::query()->where('is_active', true)->where('ends_at', '<', now())->update(['is_active' => false]);
    $this->info("Expired {$count} promotion(s).");
})->purpose('Deactivate promotions whose end date has passed');

Artisan::command('commerce:prune-carts', function () {
    $count = Cart::query()->where('status', CartStatus::Active)->where('expires_at', '<', now())->update(['status' => CartStatus::Abandoned]);
    $this->info("Abandoned {$count} expired cart(s).");
})->purpose('Mark expired active carts as abandoned');

Artisan::command('commerce:low-stock-report {--threshold=5}', function () {
    $threshold = max(0, (int) $this->option('threshold'));
    $products = Product::query()->where('is_available', true)->where('stock', '<=', $threshold)->get(['id', 'sku', 'name', 'stock']);
    Log::warning('Low stock report', ['threshold' => $threshold, 'products' => $products->toArray()]);
    $this->info("Reported {$products->count()} low-stock product(s).");
})->purpose('Write an actionable low-stock report to the application log');

Artisan::command('settings:warm-cache', function (SettingsRepository $settings) {
    $settings->forget();
    $count = count($settings->all());
    $this->info("Cached {$count} setting(s).");
})->purpose('Refresh the application settings cache');

Artisan::command('seo:refresh-sitemap-cache', function () {
    Cache::forget('seo.sitemap.payload.v1');
    $this->info('Sitemap cache invalidated; the next request will rebuild it.');
})->purpose('Invalidate the public sitemap cache');

Artisan::command('mail:check-configuration', function () {
    $unsafe = app()->isProduction() && (config('mail.default') === 'log' || config('mail.from.address') === 'hello@example.com');
    $this->line('Mailer: '.config('mail.default').'; sender: '.config('mail.from.address'));

    return $unsafe ? 1 : 0;
})->purpose('Fail when production mail still uses placeholder configuration');

Artisan::command('ops:monitor', function () {
    $queueSize = Queue::size();
    $failedJobs = DB::table('failed_jobs')->count();
    $failedWebhooks = WebhookEvent::query()->where('status', 'failed')->where('updated_at', '>=', now()->subHour())->count();
    $paymentMismatches = DB::table('payments')
        ->join('orders', 'orders.id', '=', 'payments.order_id')
        ->where('payments.status', 'paid')
        ->whereIn('orders.status', ['cancelled', 'failed'])
        ->count();
    $metrics = compact('queueSize', 'failedJobs', 'failedWebhooks', 'paymentMismatches');
    $unhealthy = $queueSize >= config('operations.queue_warning_size')
        || $failedJobs >= config('operations.failed_jobs_warning')
        || $failedWebhooks >= config('operations.failed_webhooks_warning')
        || $paymentMismatches > 0;

    $unhealthy ? Log::critical('Commerce operational alert', $metrics) : Log::info('Commerce operational health', $metrics);
    $this->line(json_encode(['healthy' => ! $unhealthy, ...$metrics], JSON_THROW_ON_ERROR));

    return $unhealthy ? 1 : 0;
})->purpose('Check queue, failed jobs, webhooks and payment/order consistency');

Artisan::command('ops:production-check {--runtime}', function () {
    $checks = [
        'environment' => app()->isProduction(),
        'debug_disabled' => config('app.debug') === false,
        'https_url' => str_starts_with((string) config('app.url'), 'https://'),
        'secure_session' => config('session.secure') === true,
        'encrypted_session' => config('session.encrypt') === true,
        'redis_session' => config('session.driver') === 'redis',
        'redis_cache' => config('cache.default') === 'redis',
        'redis_queue' => config('queue.default') === 'redis',
        'admin_mfa' => config('security.admin_mfa_required') === true,
        'csp_enforced' => config('security.csp_report_only') === false,
        'trusted_proxies' => config('security.trusted_proxies') !== [],
        'production_mail' => config('mail.default') !== 'log'
            && config('mail.from.address') !== 'hello@example.com',
        'object_storage' => config('media.disk') === 's3',
        'payment_webhook_secret' => filled(config('services.payment_webhooks.secrets.manual')),
        'shipping_webhook_secret' => filled(config('services.shipping_webhooks.secrets.manual')),
        'google_oauth' => filled(config('services.google.client_id'))
            && filled(config('services.google.client_secret'))
            && str_starts_with((string) config('services.google.redirect'), 'https://'),
        'facebook_oauth' => filled(config('services.facebook.client_id'))
            && filled(config('services.facebook.client_secret'))
            && str_starts_with((string) config('services.facebook.redirect'), 'https://'),
    ];

    if ($this->option('runtime')) {
        try {
            DB::select('SELECT 1');
            Cache::put('ops.production-check', now()->timestamp, 10);
            $checks['database'] = true;
            $checks['cache'] = Cache::has('ops.production-check');
        } catch (Throwable $exception) {
            report($exception);
            $checks['runtime'] = false;
        }
    }

    foreach ($checks as $name => $passed) {
        $this->line(sprintf('[%s] %s', $passed ? 'PASS' : 'FAIL', $name));
    }

    return in_array(false, $checks, true) ? 1 : 0;
})->purpose('Fail closed when production configuration or runtime dependencies are unsafe');

Schedule::command('commerce:expire-promotions')->hourly()->withoutOverlapping();
Schedule::command('commerce:prune-carts')->dailyAt('02:15')->withoutOverlapping();
Schedule::command('commerce:low-stock-report')->dailyAt('07:00')->withoutOverlapping();
Schedule::command('settings:warm-cache')->dailyAt('00:10')->withoutOverlapping();
Schedule::command('seo:refresh-sitemap-cache')->hourlyAt(5)->withoutOverlapping();
Schedule::command('ops:monitor')->everyFiveMinutes()->withoutOverlapping();
