<?php

return [
    'disk' => env('MEDIA_DISK', 'public'),
    'max_upload_kb' => (int) env('MEDIA_MAX_UPLOAD_KB', 5120),
    'mime_types' => ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    'variant_widths' => [320, 640, 1200],
];
