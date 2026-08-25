<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use RuntimeException;
use UnexpectedValueException;

class ChatbotService
{
    /** @throws ConnectionException */
    public function ask(array $payload): array
    {
        throw_unless(config('chatbot.enabled'), RuntimeException::class, 'Chatbot is disabled.');
        throw_unless(filled(config('chatbot.secret')), RuntimeException::class, 'Chatbot secret is not configured.');

        $response = Http::acceptJson()
            ->withHeaders(['X-Chatbot-Secret' => config('chatbot.secret')])
            ->withoutRedirecting()
            ->timeout(config('chatbot.timeout'))
            ->post(rtrim(config('chatbot.url'), '/').'/v1/chat', $payload);

        $response->throw();

        $data = $response->json();
        throw_unless(is_array($data), UnexpectedValueException::class, 'Chatbot returned invalid JSON.');

        $validated = Validator::make($data, [
            'message' => ['required', 'string', 'min:1', 'max:4000'],
            'mode' => ['required', 'in:ai,catalog'],
            'sources' => ['present', 'array', 'max:5'],
            'sources.*.title' => ['required', 'string', 'max:255'],
            'sources.*.url' => ['required', 'string', 'max:2048', 'regex:/^\/(?!\/)[A-Za-z0-9\-._~%!$&\'()*+,;=:@\/]*$/'],
            'sources.*.type' => ['required', 'in:product,article'],
        ])->validate();

        return $validated;
    }
}
