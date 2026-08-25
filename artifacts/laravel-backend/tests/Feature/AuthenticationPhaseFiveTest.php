<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class AuthenticationPhaseFiveTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_register_login_and_logout_with_safe_shared_props(): void
    {
        Notification::fake();
        $this->post('/dang-ky', ['name' => 'Nguyễn Văn An', 'email' => 'an@example.test', 'phone' => '0901234567', 'password' => 'password123', 'password_confirmation' => 'password123'])
            ->assertRedirect(route('verification.notice'));
        $user = User::whereEmail('an@example.test')->firstOrFail();
        $this->assertAuthenticatedAs($user);
        Notification::assertSentTo($user, VerifyEmail::class);
        $this->get('/tai-khoan')->assertOk()->assertInertia(fn ($page) => $page->component('Account/Index')->has('auth.user')->missing('auth.user.password')->missing('auth.user.remember_token'));
        $this->post('/dang-xuat')->assertRedirect('/');
        $this->assertGuest();
        $this->post('/dang-nhap', ['email' => $user->email, 'password' => 'password123'])->assertRedirect(route('account.index'));
        $this->assertAuthenticatedAs($user);
    }

    public function test_email_verification_and_password_reset_are_real_framework_flows(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(30), ['id' => $user->id, 'hash' => sha1($user->email)]);
        $this->actingAs($user)->get($url)->assertRedirect(route('account.index'));
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
        $this->post('/dang-xuat');
        $this->post('/quen-mat-khau', ['email' => $user->email])->assertSessionHasNoErrors();
        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_password_reset_does_not_disclose_registered_emails(): void
    {
        Notification::fake();
        $known = User::factory()->create();

        $knownResponse = $this->post('/quen-mat-khau', ['email' => $known->email]);
        $unknownResponse = $this->post('/quen-mat-khau', ['email' => 'unknown@example.test']);

        $knownResponse->assertSessionHas('status', __('passwords.sent'));
        $unknownResponse->assertSessionHas('status', __('passwords.sent'));
        Notification::assertSentTo($known, ResetPassword::class);
    }

    public function test_profile_and_password_can_be_updated(): void
    {
        $user = User::factory()->create(['password' => Hash::make('old-password')]);
        $this->actingAs($user)->patch('/tai-khoan/ho-so', ['name' => 'Tên mới', 'email' => 'new@example.test', 'phone' => '0912345678'])->assertSessionHasNoErrors();
        $this->assertNull($user->fresh()->email_verified_at);
        $this->actingAs($user)->put('/tai-khoan/mat-khau', ['current_password' => 'old-password', 'password' => 'new-password', 'password_confirmation' => 'new-password'])->assertSessionHasNoErrors();
        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
    }

    public function test_addresses_are_owned_and_only_one_is_default(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $payload = ['label' => 'Nhà', 'recipient_name' => 'Khách hàng', 'phone' => '0900000000', 'street' => '1 Nguyễn Trãi', 'ward' => 'Bến Thành', 'district' => 'Quận 1', 'city' => 'TP.HCM', 'postal_code' => null, 'is_default' => true];
        $this->actingAs($user)->post('/tai-khoan/dia-chi', $payload)->assertSessionHasNoErrors();
        $first = $user->addresses()->firstOrFail();
        $this->actingAs($user)->post('/tai-khoan/dia-chi', [...$payload, 'street' => '2 Lê Lợi'])->assertSessionHasNoErrors();
        $this->assertSame(1, $user->addresses()->where('is_default', true)->count());
        $foreign = $other->addresses()->create($payload);
        $this->actingAs($user)->delete("/tai-khoan/dia-chi/{$foreign->id}")->assertForbidden();
        $this->assertDatabaseHas('addresses', ['id' => $foreign->id]);
        $this->actingAs($user)->delete("/tai-khoan/dia-chi/{$first->id}")->assertRedirect();
    }

    public function test_guests_cannot_access_account(): void
    {
        $this->get('/tai-khoan')->assertRedirect(route('login'));
    }
}
