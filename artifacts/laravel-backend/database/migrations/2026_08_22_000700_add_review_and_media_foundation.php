<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table): void {
            $table->foreignId('verified_order_id')->nullable()->after('user_id')->constrained('orders')->nullOnDelete();
            $table->text('moderation_notes')->nullable()->after('content');
        });

        Schema::table('product_images', function (Blueprint $table): void {
            $table->json('variants')->nullable()->after('url');
            $table->string('mime_type', 100)->nullable()->after('variants');
            $table->unsignedInteger('width')->nullable()->after('mime_type');
            $table->unsignedInteger('height')->nullable()->after('width');
            $table->unsignedBigInteger('file_size')->nullable()->after('height');
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('verified_order_id');
            $table->dropColumn('moderation_notes');
        });

        Schema::table('product_images', function (Blueprint $table): void {
            $table->dropColumn(['variants', 'mime_type', 'width', 'height', 'file_size']);
        });
    }
};
