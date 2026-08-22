<?php

return [
    'queue_warning_size' => (int) env('QUEUE_WARNING_SIZE', 100),
    'failed_jobs_warning' => (int) env('FAILED_JOBS_WARNING', 1),
    'failed_webhooks_warning' => (int) env('FAILED_WEBHOOKS_WARNING', 1),
    'health_cache_seconds' => (int) env('HEALTH_CACHE_SECONDS', 15),
];
