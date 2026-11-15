<script>
	import { resolve } from '$app/paths';
	import { T } from '#lib/texts.js';

	/** @type {{ current: import('#lib/analytics.js').ConsentState, onaccept: () => void, onreject: () => void }} */
	let { current, onaccept, onreject } = $props();
</script>

<section class="consent" aria-label={T.consent.label}>
	<p>{T.consent.text} <a href={resolve('/galetes')} data-sveltekit-reload>{T.consent.more}</a></p>
	{#if current !== 'unknown'}<p>{T.consent.now(current)}</p>{/if}
	<div class="choices">
		<button type="button" class="choice" onclick={onaccept}>{T.consent.accept}</button>
		<button type="button" class="choice" onclick={onreject}>{T.consent.reject}</button>
	</div>
</section>

<style>
	.consent {
		position: sticky;
		bottom: 0;
		z-index: 1;
		max-height: 30vh;
		overflow-y: auto;
		padding: 1rem;
		padding-bottom: max(1rem, env(safe-area-inset-bottom));
		background: var(--lime-light);
		border-top: 2px solid var(--ink);
		color: var(--ink);
	}

	p {
		margin: 0 0 0.75rem;
	}

	a {
		color: inherit;
	}

	.choices {
		display: flex;
		gap: 0.75rem;
	}

	.choice {
		min-width: 44px;
		min-height: 44px;
		padding: 0.5rem 1.25rem;
		border: 0;
		background: var(--ink);
		color: var(--page);
		font-family: var(--font-display);
		font-size: 1.25rem;
		cursor: pointer;
	}

	:global(body:has(dialog[open])) .consent {
		display: none;
	}
</style>
