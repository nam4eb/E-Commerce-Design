<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiChatbotTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'chatbot.enabled' => true,
            'chatbot.url' => 'http://chatbot:8001',
            'chatbot.secret' => 'test-secret',
        ]);
    }

    public function test_chat_is_proxied_without_exposing_service_secret(): void
    {
        Http::fake(['http://chatbot:8001/v1/chat' => Http::response([
            'message' => 'Điều hòa phù hợp phòng 15m².',
            'sources' => [['title' => 'Daikin', 'url' => '/dieu-hoa/daikin', 'type' => 'product']],
            'mode' => 'catalog',
        ])]);

        $this->postJson('/api/v1/chat', [
            'message' => 'Phòng 15m2 dùng máy nào?',
            'history' => [],
        ])->assertOk()
            ->assertJsonPath('message', 'Điều hòa phù hợp phòng 15m².')
            ->assertJsonMissing(['test-secret']);

        Http::assertSent(fn ($request) => $request->hasHeader('X-Chatbot-Secret', 'test-secret')
            && $request['locale'] === 'vi');
    }

    public function test_chat_input_is_bounded(): void
    {
        $this->postJson('/api/v1/chat', ['message' => 'x'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('message');
        Http::assertNothingSent();
    }

    public function test_chat_fails_safely_when_python_service_is_unavailable(): void
    {
        Http::fake(['*' => Http::response([], 500)]);

        $this->postJson('/api/v1/chat', ['message' => 'Tư vấn điều hòa'])
            ->assertStatus(503)
            ->assertJsonPath('sources', []);
    }

    public function test_chat_rejects_untrusted_links_and_oversized_responses(): void
    {
        Http::fake(['*' => Http::response([
            'message' => str_repeat('x', 4001),
            'sources' => [['title' => 'Unsafe', 'url' => 'javascript:alert(1)', 'type' => 'product']],
            'mode' => 'ai',
        ])]);

        $this->postJson('/api/v1/chat', ['message' => 'Tư vấn điều hòa'])
            ->assertStatus(503)
            ->assertJsonPath('sources', []);
    }

    public function test_chat_endpoint_is_rate_limited(): void
    {
        Http::fake(['*' => Http::response(['message' => 'ok', 'sources' => [], 'mode' => 'catalog'])]);

        for ($attempt = 0; $attempt < 15; $attempt++) {
            $this->postJson('/api/v1/chat', ['message' => 'Tư vấn điều hòa'])->assertOk();
        }

        $this->postJson('/api/v1/chat', ['message' => 'Tư vấn điều hòa'])->assertTooManyRequests();
    }
}
