<script>
	import '@fontsource/special-gothic-condensed-one/400.css';
	import '@fontsource-variable/special-gothic/wght.css';
	import favicon from '#lib/assets/favicon.svg';

	/** @type {{children: import('svelte').Snippet}} */
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

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
