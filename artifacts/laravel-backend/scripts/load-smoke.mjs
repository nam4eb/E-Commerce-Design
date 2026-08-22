const baseUrl = process.env.LOAD_BASE_URL ?? 'http://localhost:8000';
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 8);
const iterations = Number(process.env.LOAD_ITERATIONS ?? 10);
const p95BudgetMs = Number(process.env.LOAD_P95_BUDGET_MS ?? 1500);
const paths = ['/', '/dieu-hoa', '/dieu-hoa/daikin-inverter-1-5-hp-atkf35xvmv', '/tim-kiem?q=daikin', '/gio-hang'];
const durations = [];
let failures = 0;

async function request(path) {
    const start = performance.now();
    try {
        const response = await fetch(baseUrl + path, {redirect: 'manual'});
        if (response.status >= 500) failures++;
        await response.arrayBuffer();
    } catch {
        failures++;
    } finally {
        durations.push(performance.now() - start);
    }
}

const work = Array.from({length: iterations}, (_, iteration) => paths.map(path => () => request(path))).flat();
for (let index = 0; index < work.length; index += concurrency) {
    await Promise.all(work.slice(index, index + concurrency).map(task => task()));
}

durations.sort((a, b) => a - b);
const p95 = durations[Math.max(0, Math.ceil(durations.length * 0.95) - 1)] ?? Infinity;
const result = {requests: durations.length, failures, p95_ms: Math.round(p95), budget_ms: p95BudgetMs};
console.log(JSON.stringify(result));
if (failures > 0 || p95 > p95BudgetMs) process.exit(1);
