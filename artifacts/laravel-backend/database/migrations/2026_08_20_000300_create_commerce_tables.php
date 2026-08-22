<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type', 30);
            $table->decimal('value', 15, 2);
            $table->decimal('maximum_discount', 15, 2)->nullable();
            $table->unsignedInteger('priority')->default(0);
            $table->boolean('is_stackable')->default(false);
            $table->timestamp('starts_at')->nullable()->index();
            $table->timestamp('ends_at')->nullable()->index();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        foreach (['product', 'category', 'brand'] as $target) {
            Schema::create("promotion_{$target}", function (Blueprint $table) use ($target) {
                $table->foreignId('promotion_id')->constrained()->cascadeOnDelete();
                $table->foreignId("{$target}_id")->constrained()->cascadeOnDelete();
                $table->primary(['promotion_id', "{$target}_id"]);
            });
        }

        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('type', 30);
            $table->decimal('value', 15, 2);
            $table->decimal('maximum_discount', 15, 2)->nullable();
            $table->decimal('minimum_order', 15, 2)->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('per_user_limit')->default(1);
            $table->unsignedInteger('used_count')->default(0);
            $table->timestamp('starts_at')->nullable()->index();
            $table->timestamp('ends_at')->nullable()->index();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->uuid('idempotency_key')->unique();
            $table->string('number')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('address_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('coupon_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 20)->default('pending')->index();
            $table->char('currency', 3)->default('VND');
            $table->decimal('subtotal', 15, 2);
            $table->decimal('discount_total', 15, 2)->default(0);
            $table->decimal('shipping_total', 15, 2)->default(0);
            $table->decimal('installation_total', 15, 2)->default(0);
            $table->decimal('grand_total', 15, 2);
            $table->string('customer_name');
            $table->string('customer_phone', 20);
            $table->string('customer_email')->nullable();
            $table->string('shipping_street');
            $table->string('shipping_ward')->nullable();
            $table->string('shipping_district');
            $table->string('shipping_city');
            $table->string('shipping_postal_code', 20)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('placed_at')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('sku');
            $table->string('product_name');
            $table->json('product_snapshot')->nullable();
            $table->decimal('unit_price', 15, 2);
            $table->unsignedInteger('quantity');
            $table->decimal('discount_total', 15, 2)->default(0);
            $table->decimal('line_total', 15, 2);
            $table->boolean('installation_required')->default(false);
            $table->decimal('installation_fee', 15, 2)->default(0);
            $table->text('installation_notes')->nullable();
            $table->timestamps();
            $table->index(['order_id', 'product_id']);
        });

        Schema::create('coupon_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->decimal('discount_amount', 15, 2);
            $table->timestamps();
            $table->unique(['coupon_id', 'order_id']);
            $table->index(['coupon_id', 'user_id']);
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('provider');
            $table->string('method')->nullable();
            $table->string('transaction_id')->nullable()->unique();
            $table->string('status', 20)->default('pending')->index();
            $table->char('currency', 3)->default('VND');
            $table->decimal('amount', 15, 2);
            $table->json('payload')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->index(['order_id', 'status']);
        });

        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('carrier')->nullable();
            $table->string('tracking_number')->nullable()->unique();
            $table->string('status', 20)->default('pending')->index();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
            $table->index(['order_id', 'status']);
        });

        Schema::create('installations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_item_id')->constrained()->cascadeOnDelete()->unique();
            $table->decimal('fee', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('pending')->index();
            $table->timestamp('scheduled_at')->nullable()->index();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->longText('value')->nullable();
            $table->string('type', 20)->default('string');
            $table->boolean('is_public')->default(false)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['settings', 'installations', 'shipments', 'payments', 'coupon_redemptions', 'order_items', 'orders', 'coupons', 'promotion_brand', 'promotion_category', 'promotion_product', 'promotions'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
