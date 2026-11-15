<script>
	import { resolve } from '$app/paths';
	import { T } from '#lib/texts.js';

	/** @type {{ showConsent: boolean, onconsent: () => void }} */
	let { showConsent, onconsent } = $props();
</script>

<footer>
	{#if showConsent}<button type="button" onclick={onconsent}>{T.footer.consent}</button>{/if}
	<a href={resolve('/galetes')} data-sveltekit-reload>{T.footer.policy}</a>
	<a href="https://barcelonaencomu.cat/politica-de-privacitat/" target="_blank" rel="noopener noreferrer">
		{T.footer.privacy}<span class="sr-only"> {T.newTab}</span>
	</a>
</footer>

<style>
	footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 0.5rem 1rem;
		padding: 1.5rem 1rem;
		color: var(--ink);
		font-size: 0.85rem;
	}

	a, button {
		color: inherit;
	}

	button {
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}
</style>
