<?php

return [
    'enabled' => env('CHATBOT_ENABLED', true),
    'url' => env('CHATBOT_SERVICE_URL', 'http://chatbot:8001'),
    'secret' => env('CHATBOT_SERVICE_SECRET'),
    'timeout' => (int) env('CHATBOT_TIMEOUT_SECONDS', 25),
];
