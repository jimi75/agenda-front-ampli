import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:5300/agenda-front-ampli/';

export default defineConfig({
	testDir: 'e2e',
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL,
		locale: 'ca-ES',
		timezoneId: 'Europe/Madrid'
	},
	webServer: {
		command: 'node e2e/serve.js',
		url: baseURL,
		// Includes the production build that e2e/serve.js runs before starting the preview.
		timeout: 180_000,
		reuseExistingServer: !process.env.CI
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
		// A fixed viewport keeps the width checks deterministic.
		{ name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
		// Only the image test: WebKit is where a blank image is a known risk. It never blocks a deploy.
		{ name: 'webkit', testMatch: 'image.spec.js', use: { ...devices['Desktop Safari'] } }
	]
});
