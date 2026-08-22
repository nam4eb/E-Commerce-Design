<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class RequestContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = $this->requestId($request);
        $request->attributes->set('request_id', $requestId);
        Log::withContext(['request_id' => $requestId]);

        try {
            $response = $next($request);
        } catch (Throwable $exception) {
            Log::error('Unhandled HTTP exception', [
                'method' => $request->method(),
                'path' => $request->path(),
                'exception' => $exception::class,
            ]);
            throw $exception;
        }

        $response->headers->set('X-Request-ID', $requestId);

        return $response;
    }

    private function requestId(Request $request): string
    {
        $candidate = (string) $request->header('X-Request-ID');

        return preg_match('/^[A-Za-z0-9._-]{8,100}$/', $candidate) ? $candidate : (string) Str::uuid();
    }
}
