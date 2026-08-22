<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->index(
                ['category_id', 'status', 'created_at'],
                'products_category_status_created_index',
            );
            $table->index(
                ['brand_id', 'status', 'created_at'],
                'products_brand_status_created_index',
            );
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->dropIndex('products_category_status_created_index');
            $table->dropIndex('products_brand_status_created_index');
        });
    }
};
