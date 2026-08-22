<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->timestamp('provider_synced_at')->nullable()->after('paid_at');
            $table->text('last_error')->nullable()->after('provider_synced_at');
        });
        Schema::table('shipments', function (Blueprint $table) {
            $table->string('provider')->default('manual')->after('order_id');
            $table->json('payload')->nullable()->after('tracking_number');
            $table->timestamp('provider_synced_at')->nullable()->after('delivered_at');
            $table->text('last_error')->nullable()->after('provider_synced_at');
        });
        Schema::create('webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 50);
            $table->string('external_id', 191);
            $table->string('type')->nullable();
            $table->string('status', 20)->default('received')->index();
            $table->char('payload_hash', 64);
            $table->json('payload');
            $table->text('error')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
            $table->unique(['provider', 'external_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_events');
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn(['provider', 'payload', 'provider_synced_at', 'last_error']);
        });
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['provider_synced_at', 'last_error']);
        });
    }
};
