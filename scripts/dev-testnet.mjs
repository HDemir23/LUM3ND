import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';

let config;
try {
  config = parseEnv(readFileSync('.env.testnet', 'utf8'));
} catch {
  console.error('Önce npm run test:testnet ile demo hesaplarını hazırlayın.');
  process.exit(1);
}
if (config.STELLAR_NETWORK !== 'testnet' || config.TESTNET_DEMO !== '1') {
  throw new Error('Bu komut yalnızca testnet demo yapılandırmasıyla çalışır.');
}
// Next forwards execArgv to its worker's NODE_OPTIONS. Load env here instead
// of using node --env-file, which cannot be forwarded via NODE_OPTIONS.
const child = spawn(process.execPath, [
  'node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', 'localhost', '--port', '3100',
], { env: { ...process.env, ...config }, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 0; });
