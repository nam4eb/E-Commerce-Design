<?php

use App\Http\Controllers\Account\AccountController;
use App\Http\Controllers\Account\AddressController;
use App\Http\Controllers\Account\PasswordController as AccountPasswordController;
use App\Http\Controllers\Account\ProfileController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\SocialLoginController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('/dang-nhap', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/dang-nhap', [AuthenticatedSessionController::class, 'store']);
    Route::get('/dang-nhap/{provider}', [SocialLoginController::class, 'redirect'])
        ->whereIn('provider', ['google', 'facebook'])
        ->name('oauth.redirect');
    Route::get('/dang-nhap/{provider}/callback', [SocialLoginController::class, 'callback'])
        ->whereIn('provider', ['google', 'facebook'])
        ->name('oauth.callback');
    Route::get('/dang-ky', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('/dang-ky', [RegisteredUserController::class, 'store']);
    Route::get('/quen-mat-khau', [PasswordResetController::class, 'request'])->name('password.request');
    Route::post('/quen-mat-khau', [PasswordResetController::class, 'email'])->name('password.email');
    Route::get('/dat-lai-mat-khau/{token}', [PasswordResetController::class, 'reset'])->name('password.reset');
    Route::post('/dat-lai-mat-khau', [PasswordResetController::class, 'update'])->name('password.update');
});

Route::middleware('auth')->group(function () {
    Route::post('/dang-xuat', [AuthenticatedSessionController::class, 'destroy'])->name('logout');
    Route::get('/xac-minh-email', [EmailVerificationController::class, 'notice'])->name('verification.notice');
    Route::get('/xac-minh-email/{id}/{hash}', [EmailVerificationController::class, 'verify'])->middleware('signed')->name('verification.verify');
    Route::post('/xac-minh-email/gui-lai', [EmailVerificationController::class, 'send'])->middleware('throttle:6,1')->name('verification.send');

    Route::get('/tai-khoan', AccountController::class)->name('account.index');
    Route::patch('/tai-khoan/ho-so', [ProfileController::class, 'update'])->name('account.profile.update');
    Route::put('/tai-khoan/mat-khau', [AccountPasswordController::class, 'update'])->name('account.password.update');
    Route::post('/tai-khoan/dia-chi', [AddressController::class, 'store'])->name('account.addresses.store');
    Route::put('/tai-khoan/dia-chi/{address}', [AddressController::class, 'update'])->name('account.addresses.update');
    Route::delete('/tai-khoan/dia-chi/{address}', [AddressController::class, 'destroy'])->name('account.addresses.destroy');
});
