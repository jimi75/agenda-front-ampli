// Single command of Playwright's webServer: build the site for the tests and serve it like GitHub Pages does.
// The script URL is never served: e2e/script.js answers those requests inside the browser.
import { spawn, spawnSync } from 'node:child_process';

const env = {
	...process.env,
	NODE_ENV: 'production',
	BASE_PATH: '/agenda-front-ampli',
	VITE_AGENDA_API_URL: 'http://localhost:5301/exec'
};

const build = spawnSync('npx', ['vite', 'build'], { env, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

const preview = spawn('npx', ['vite', 'preview', '--port', '5300', '--strictPort'], { env, stdio: 'inherit' });
preview.on('exit', (code) => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => preview.kill(signal));
