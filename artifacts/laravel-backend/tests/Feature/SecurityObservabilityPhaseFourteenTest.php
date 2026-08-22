<?php

namespace Tests\Feature;

use App\Enums\AdminRole;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityObservabilityPhaseFourteenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
    }

    public function test_public_responses_have_security_and_correlation_headers(): void
    {
        $response = $this->withHeader('X-Request-ID', 'phase14-request-123')->get('/');

        $response->assertOk()
            ->assertHeader('X-Request-ID', 'phase14-request-123')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $this->assertStringContainsString("frame-ancestors 'none'", $response->headers->get('Content-Security-Policy'));
        $this->assertStringNotContainsString("'unsafe-eval'", $response->headers->get('Content-Security-Policy'));
    }

    public function test_untrusted_request_id_is_replaced_and_sensitive_pages_are_not_cached(): void
    {
        $response = $this->withHeader('X-Request-ID', "bad\r\nheader")->get('/gio-hang');

        $response->assertOk()->assertHeader('Cache-Control', 'no-store, private');
        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}$/', $response->headers->get('X-Request-ID'));
    }

    public function test_webhooks_require_json_and_enforce_payload_limit(): void
    {
        $this->post('/api/v1/webhooks/payments/manual', [], ['CONTENT_TYPE' => 'text/plain'])->assertStatus(415);
        config(['security.webhook_max_bytes' => 10]);
        $this->call('POST', '/api/v1/webhooks/payments/manual', [], [], [], ['CONTENT_TYPE' => 'application/json'], str_repeat('x', 11))->assertStatus(413);
    }

    public function test_readiness_checks_database_cache_and_queue(): void
    {
        $this->get('/ready')->assertOk()
            ->assertJson(['ready' => true, 'checks' => ['database' => true, 'cache' => true, 'queue' => true]])
            ->assertHeader('Cache-Control', 'no-store, private');
    }

    public function test_admin_mfa_secrets_are_encrypted_and_hidden(): void
    {
        $admin = User::factory()->create(['role' => AdminRole::SuperAdmin]);
        $admin->saveAppAuthenticationSecret('phase14-totp-secret');
        $admin->saveAppAuthenticationRecoveryCodes(['recovery-one']);

        $raw = $admin->getRawOriginal('app_authentication_secret');
        $this->assertNotSame('phase14-totp-secret', $raw);
        $this->assertSame('phase14-totp-secret', $admin->fresh()->getAppAuthenticationSecret());
        $this->assertArrayNotHasKey('app_authentication_secret', $admin->fresh()->toArray());
        $this->assertArrayNotHasKey('app_authentication_recovery_codes', $admin->fresh()->toArray());
    }

    public function test_operational_monitor_is_green_on_clean_state(): void
    {
        $this->artisan('ops:monitor')->assertSuccessful()->expectsOutputToContain('"healthy":true');
    }
}
