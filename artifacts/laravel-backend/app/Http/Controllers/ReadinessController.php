<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Throwable;

class ReadinessController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = Cache::remember('operations.readiness', config('operations.health_cache_seconds'), function (): array {
            return [
                'database' => $this->check(fn () => DB::select('SELECT 1')),
                'cache' => $this->check(function (): void {
                    Cache::put('operations.readiness.probe', 'ok', 10);
                    throw_unless(Cache::get('operations.readiness.probe') === 'ok', \RuntimeException::class, 'Cache probe failed.');
                }),
                'queue' => $this->check(fn () => Queue::size()),
            ];
        });
        $ready = ! in_array(false, $checks, true);

        return response()->json(['ready' => $ready, 'checks' => $checks], $ready ? 200 : 503)
            ->header('Cache-Control', 'no-store');
    }

    private function check(callable $callback): bool
    {
        try {
            $callback();

            return true;
        } catch (Throwable $exception) {
            report($exception);

            return false;
        }
    }
}
