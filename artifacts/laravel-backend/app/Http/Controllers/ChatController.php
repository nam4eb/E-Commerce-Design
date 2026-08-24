<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChatRequest;
use App\Services\ChatbotService;
use Illuminate\Http\JsonResponse;
use Throwable;

class ChatController extends Controller
{
    public function __invoke(ChatRequest $request, ChatbotService $chatbot): JsonResponse
    {
        try {
            return response()->json($chatbot->ask([
                ...$request->validated(),
                'locale' => 'vi',
            ]))->header('Cache-Control', 'no-store');
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Trợ lý đang tạm thời gián đoạn. Vui lòng thử lại sau hoặc gọi 1800 6865.',
                'sources' => [],
            ], 503)->header('Cache-Control', 'no-store');
        }
    }
}
