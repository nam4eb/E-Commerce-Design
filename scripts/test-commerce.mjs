import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const require = createRequire(new URL('../artifacts/api-server/package.json', import.meta.url));
const { build } = require('esbuild');
mkdirSync('.data', { recursive: true });
await build({ entryPoints: ['artifacts/api-server/test-commerce.ts'], outfile: '.data/commerce-test.cjs', bundle: true, platform: 'node', format: 'cjs', external: ['pg-native'], logLevel: 'warning' });
const result = spawnSync(process.execPath, ['--test', '.data/commerce-test.cjs'], { stdio: 'inherit' });
process.exit(result.status || 0);
