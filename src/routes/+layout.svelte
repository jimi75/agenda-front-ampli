<script>
	import '@fontsource/special-gothic-condensed-one/400.css';
	import '@fontsource-variable/special-gothic/wght.css';
	import favicon from '#lib/assets/favicon.svg';
	import { browser } from '$app/env';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onMount, setContext } from 'svelte';
	import { createAnalytics } from '#lib/analytics.js';
	import { browserStorage } from '#lib/api.js';
	import ConsentBanner from '#lib/components/ConsentBanner.svelte';
	import Footer from '#lib/components/Footer.svelte';

	/** @type {{children: import('svelte').Snippet}} */
	let { children } = $props();

	const districte = page.data.district?.slug ?? 'cap';
	const analytics = browser
		? createAnalytics({
			id: import.meta.env.VITE_GA_ID ?? '',
			storage: browserStorage(),
			doc: document,
			win: window,
			href: location.href,
			cookiePath: resolve('/[[districte]]', { districte: '' }).replace(/\/$/, '') || '/',
			dev: import.meta.env.DEV,
			now: Date.now,
			reload: () => location.reload()
		})
		: createAnalytics({ id: '' });
	setContext('analytics', analytics);
	if (analytics.consent() === 'granted') analytics.load(districte);

	let consent = $state(/** @type {import('#lib/analytics.js').ConsentState} */ ('unknown'));
	let bannerOpen = $state(false);

	onMount(() => {
		consent = analytics.consent();
		bannerOpen = analytics.enabled && consent === 'unknown';
	});

	function focusMain() {
		const main = document.querySelector('main');
		main?.setAttribute('tabindex', '-1');
		main?.focus({ preventScroll: true });
	}

	function accept() {
		analytics.accept(districte);
		consent = 'granted';
		bannerOpen = false;
		focusMain();
	}

	function reject() {
		analytics.reject();
		consent = 'denied';
		bannerOpen = false;
		focusMain();
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
<Footer showConsent={analytics.enabled} onconsent={() => (bannerOpen = true)} />
{#if bannerOpen}
	<ConsentBanner current={consent} onaccept={accept} onreject={reject} />
{/if}

<style>
	:global(:root) {
		--lime: #cfe287;
		--lime-dark: #b7c879;
		--lime-light: #eef5cf;
		--orange: #de4b28;
		--rust: #a8351a;
		--ink: #3a150c;
		--page: #fbfdf2;
		--font-display: 'Special Gothic Condensed One', Impact, 'Arial Narrow', sans-serif;
		--font-text: 'Special Gothic Variable', system-ui, -apple-system, 'Segoe UI', sans-serif;
	}

	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}

	:global(html) {
		-webkit-text-size-adjust: 100%;
		text-size-adjust: 100%;
	}

	:global(body) {
		margin: 0;
		background: var(--page);
		color: var(--ink);
		font-family: var(--font-text);
		line-height: 1.4;
	}

	:global(body:has(dialog[open])) {
		overflow: hidden;
	}

	:global(:focus-visible) {
		outline: 3px solid var(--ink);
		outline-offset: 2px;
		box-shadow: 0 0 0 6px #fff;
	}

	:global(.sr-only) {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
		border: 0;
	}
</style>
