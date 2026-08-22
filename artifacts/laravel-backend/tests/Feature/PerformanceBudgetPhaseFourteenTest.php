<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PerformanceBudgetPhaseFourteenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_homepage_stays_within_query_budget(): void
    {
        $this->assertQueryBudget('/', 15);
    }

    public function test_category_stays_within_query_budget(): void
    {
        $this->assertQueryBudget('/dieu-hoa', 16);
    }

    public function test_product_stays_within_query_budget(): void
    {
        $this->assertQueryBudget('/dieu-hoa/daikin-inverter-1-5-hp-atkf35xvmv', 14);
    }

    private function assertQueryBudget(string $uri, int $budget): void
    {
        $queries = [];
        DB::listen(function ($query) use (&$queries): void {
            $queries[] = $query->sql;
        });

        $this->get($uri)->assertOk();
        $this->assertLessThanOrEqual($budget, count($queries), "{$uri} exceeded query budget: ".implode("\n", $queries));
    }
}
