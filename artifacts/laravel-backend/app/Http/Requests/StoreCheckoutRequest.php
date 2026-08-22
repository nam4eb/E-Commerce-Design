<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'idempotency_key' => ['required', 'uuid'],
            'address_id' => ['nullable', 'integer', 'exists:addresses,id'],
            'customer_name' => ['required_without:address_id', 'nullable', 'string', 'max:255'],
            'customer_phone' => ['required_without:address_id', 'nullable', 'string', 'max:20'],
            'customer_email' => ['nullable', 'email', 'max:255'],
            'shipping_street' => ['required_without:address_id', 'nullable', 'string', 'max:255'],
            'shipping_ward' => ['nullable', 'string', 'max:255'],
            'shipping_district' => ['required_without:address_id', 'nullable', 'string', 'max:255'],
            'shipping_city' => ['required_without:address_id', 'nullable', 'string', 'max:100'],
            'shipping_postal_code' => ['nullable', 'string', 'max:20'],
            'payment_method' => ['required', Rule::in(['cod', 'bank_transfer'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
