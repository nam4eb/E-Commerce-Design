<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'label' => ['nullable', 'string', 'max:50'], 'recipient_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'], 'street' => ['required', 'string', 'max:255'],
            'ward' => ['nullable', 'string', 'max:100'], 'district' => ['required', 'string', 'max:100'],
            'city' => ['required', 'string', 'max:100'], 'postal_code' => ['nullable', 'string', 'max:20'],
            'is_default' => ['boolean'],
        ];
    }
}
