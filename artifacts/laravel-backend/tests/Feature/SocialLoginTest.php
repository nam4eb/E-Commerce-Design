<?php

namespace Tests\Feature;

use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class SocialLoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.google' => [
                'client_id' => 'google-id',
                'client_secret' => 'google-secret',
                'redirect' => 'http://localhost/dang-nhap/google/callback',
            ],
        ]);
    }

    public function test_login_page_only_exposes_configured_social_providers(): void
    {
        $this->get('/dang-nhap')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Auth/Login')
                ->where('oauthProviders', ['google']));
    }

    public function test_google_redirect_uses_stateful_socialite_provider(): void
    {
        $driver = Mockery::mock(Provider::class);
        $driver->shouldReceive('scopes')->once()->with(['email'])->andReturnSelf();
        $driver->shouldReceive('redirect')->once()->andReturn(redirect()->away('https://accounts.google.test/oauth'));
        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($driver);

        $this->get('/dang-nhap/google')
            ->assertRedirect('https://accounts.google.test/oauth');
    }

    public function test_callback_creates_verified_customer_and_social_identity(): void
    {
        $this->mockSocialUser('google-123', 'Khách Google', 'new-google@example.com');

        $this->get('/dang-nhap/google/callback')
            ->assertRedirect(route('account.index'));

        $user = User::query()->where('email', 'new-google@example.com')->firstOrFail();
        $this->assertAuthenticatedAs($user);
        $this->assertNotNull($user->email_verified_at);
        $this->assertNull($user->password);
        $this->assertDatabaseHas('social_accounts', [
            'user_id' => $user->id,
            'provider' => 'google',
            'provider_user_id' => 'google-123',
        ]);
    }

    public function test_callback_reuses_matching_social_identity(): void
    {
        $user = User::factory()->create();
        SocialAccount::query()->create([
            'user_id' => $user->id,
            'provider' => 'google',
            'provider_user_id' => 'google-existing',
        ]);
        $this->mockSocialUser('google-existing', $user->name, $user->email);

        $this->get('/dang-nhap/google/callback')->assertRedirect(route('account.index'));

        $this->assertAuthenticatedAs($user);
        $this->assertSame(1, User::query()->count());
    }

    public function test_callback_does_not_auto_link_an_existing_email(): void
    {
        User::factory()->create(['email' => 'existing@example.com']);
        $this->mockSocialUser('different-provider-id', 'Existing', 'existing@example.com');

        $this->get('/dang-nhap/google/callback')
            ->assertRedirect(route('login'))
            ->assertSessionHas('oauth_error');

        $this->assertGuest();
        $this->assertDatabaseCount('social_accounts', 0);
    }

    public function test_callback_rejects_provider_without_email(): void
    {
        $this->mockSocialUser('google-no-email', 'No Email', null);

        $this->get('/dang-nhap/google/callback')
            ->assertRedirect(route('login'))
            ->assertSessionHas('oauth_error');

        $this->assertGuest();
    }

    public function test_unconfigured_provider_fails_closed(): void
    {
        config(['services.facebook' => ['client_id' => null, 'client_secret' => null, 'redirect' => null]]);

        $this->get('/dang-nhap/facebook')->assertStatus(503);
    }

    private function mockSocialUser(string $id, string $name, ?string $email): void
    {
        $socialUser = Mockery::mock(SocialiteUser::class);
        $socialUser->shouldReceive('getId')->andReturn($id);
        $socialUser->shouldReceive('getName')->andReturn($name);
        $socialUser->shouldReceive('getEmail')->andReturn($email);
        $socialUser->shouldReceive('getAvatar')->andReturn('https://images.example.com/avatar.jpg');

        $driver = Mockery::mock(Provider::class);
        $driver->shouldReceive('user')->once()->andReturn($socialUser);
        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($driver);
    }
}
