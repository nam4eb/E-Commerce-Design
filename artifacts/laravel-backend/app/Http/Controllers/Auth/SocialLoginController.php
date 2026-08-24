<?php

namespace App\Http\Controllers\Auth;

use App\Enums\AdminRole;
use App\Http\Controllers\Controller;
use App\Models\SocialAccount;
use App\Models\User;
use App\Services\CartService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirectResponse;
use Throwable;

class SocialLoginController extends Controller
{
    private const PROVIDERS = ['google', 'facebook'];

    public function redirect(string $provider): SymfonyRedirectResponse
    {
        abort_unless($this->isConfigured($provider), 503, 'Nhà cung cấp đăng nhập chưa được cấu hình.');

        return Socialite::driver($provider)->scopes(['email'])->redirect();
    }

    public function callback(Request $request, CartService $carts, string $provider): RedirectResponse
    {
        abort_unless($this->isConfigured($provider), 503, 'Nhà cung cấp đăng nhập chưa được cấu hình.');

        try {
            $socialUser = Socialite::driver($provider)->user();
            $providerUserId = trim((string) $socialUser->getId());
            $email = mb_strtolower(trim((string) $socialUser->getEmail()));

            if ($providerUserId === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $this->failure('Không thể lấy email hợp lệ từ tài khoản '.ucfirst($provider).'.');
            }

            $user = DB::transaction(function () use ($provider, $providerUserId, $email, $socialUser): ?User {
                $account = SocialAccount::query()
                    ->where('provider', $provider)
                    ->where('provider_user_id', $providerUserId)
                    ->lockForUpdate()
                    ->first();

                if ($account) {
                    return $account->user()->first();
                }

                if (User::withTrashed()->where('email', $email)->lockForUpdate()->exists()) {
                    return null;
                }

                $user = User::query()->create([
                    'name' => trim((string) $socialUser->getName()) ?: strstr($email, '@', true),
                    'email' => $email,
                    'password' => null,
                    'role' => AdminRole::Customer,
                    'email_verified_at' => now(),
                ]);

                $user->socialAccounts()->create([
                    'provider' => $provider,
                    'provider_user_id' => $providerUserId,
                    'avatar_url' => $socialUser->getAvatar(),
                ]);

                return $user;
            });

            if (! $user) {
                return $this->failure('Email này đã có tài khoản. Hãy đăng nhập bằng mật khẩu để bảo vệ tài khoản của bạn.');
            }

            if ($user->trashed()) {
                return $this->failure('Tài khoản này hiện không hoạt động.');
            }

            Auth::login($user, true);
            $request->session()->regenerate();
            $carts->mergeGuestCart($request, $user);

            return redirect()->intended(route('account.index'));
        } catch (Throwable $exception) {
            Log::warning('Social login failed', [
                'provider' => $provider,
                'exception' => $exception::class,
            ]);

            return $this->failure('Đăng nhập '.ucfirst($provider).' không thành công hoặc đã bị hủy.');
        }
    }

    public static function configuredProviders(): array
    {
        return array_values(array_filter(self::PROVIDERS, fn (string $provider): bool => filled(config("services.{$provider}.client_id"))
            && filled(config("services.{$provider}.client_secret"))
            && filled(config("services.{$provider}.redirect"))));
    }

    private function isConfigured(string $provider): bool
    {
        return in_array($provider, self::configuredProviders(), true);
    }

    private function failure(string $message): RedirectResponse
    {
        return redirect()->route('login')->with('oauth_error', $message);
    }
}
