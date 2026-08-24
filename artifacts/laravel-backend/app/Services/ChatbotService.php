<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class ChatbotService
{
    /** @throws ConnectionException */
    public function ask(array $payload): array
    {
        throw_unless(config('chatbot.enabled'), RuntimeException::class, 'Chatbot is disabled.');
        throw_unless(filled(config('chatbot.secret')), RuntimeException::class, 'Chatbot secret is not configured.');

        $response = Http::acceptJson()
            ->withHeaders(['X-Chatbot-Secret' => config('chatbot.secret')])
            ->timeout(config('chatbot.timeout'))
            ->post(rtrim(config('chatbot.url'), '/').'/v1/chat', $payload);

        $response->throw();

        return $response->json();
    }
}
