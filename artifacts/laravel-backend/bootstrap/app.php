<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RequestContext;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\ValidateWebhookRequest;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append([RequestContext::class, SecurityHeaders::class]);
        $middleware->web(append: [HandleInertiaRequests::class]);
        $middleware->alias(['webhook.secure' => ValidateWebhookRequest::class]);
        $middleware->trustProxies(at: array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('TRUSTED_PROXIES', '')),
        ))));
        $middleware->validateCsrfTokens(except: ['api/v1/webhooks/payments/*', 'api/v1/webhooks/shipments/*']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
