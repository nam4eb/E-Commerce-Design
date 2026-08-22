<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CartItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:'.config('commerce.max_item_quantity')],
            'installation_required' => ['sometimes', 'boolean'],
            'installation_notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
