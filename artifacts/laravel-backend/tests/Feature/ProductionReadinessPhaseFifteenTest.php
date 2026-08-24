<?php

namespace Tests\Feature;

use Tests\TestCase;

class ProductionReadinessPhaseFifteenTest extends TestCase
{
    public function test_production_check_rejects_unsafe_defaults(): void
    {
        $this->artisan('ops:production-check')->assertFailed();
    }

    public function test_production_check_accepts_hardened_configuration(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');
        config([
            'app.debug' => false,
            'app.url' => 'https://shop.example.com',
            'session.secure' => true,
            'session.encrypt' => true,
            'session.driver' => 'redis',
            'cache.default' => 'redis',
            'queue.default' => 'redis',
            'security.admin_mfa_required' => true,
            'security.csp_report_only' => false,
            'security.trusted_proxies' => ['10.0.0.0/8'],
            'mail.default' => 'smtp',
            'mail.from.address' => 'orders@example.com',
            'media.disk' => 's3',
            'services.payment_webhooks.secrets.manual' => 'payment-secret',
            'services.shipping_webhooks.secrets.manual' => 'shipping-secret',
        ]);

        $this->artisan('ops:production-check')->assertSuccessful();
    }
}
