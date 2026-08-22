<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateWebhookRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->isJson(), 415, 'Webhook content type must be application/json.');
        abort_if(strlen($request->getContent()) > config('security.webhook_max_bytes'), 413, 'Webhook payload is too large.');

        return $next($request);
    }
}
