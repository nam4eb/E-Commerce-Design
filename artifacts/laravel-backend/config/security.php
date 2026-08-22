<?php

return [
    'trusted_proxies' => array_values(array_filter(array_map('trim', explode(',', (string) env('TRUSTED_PROXIES', ''))))),
    'hsts_max_age' => (int) env('HSTS_MAX_AGE', 31536000),
    'webhook_max_bytes' => (int) env('WEBHOOK_MAX_BYTES', 262144),
    'csp_report_only' => filter_var(env('CSP_REPORT_ONLY', false), FILTER_VALIDATE_BOOLEAN),
    'admin_mfa_required' => filter_var(env('ADMIN_MFA_REQUIRED', true), FILTER_VALIDATE_BOOLEAN),
];
