<script>
	import { T } from '#lib/texts.js';
</script>

<ul class="legend" aria-label={T.legendLabel}>
	<li class="chip accio">{T.types.accio}</li>
	<li class="chip acte">{T.types.acte}</li>
</ul>

<style>
	.legend {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		margin: 1rem 0 0;
		padding: 0;
		list-style: none;
	}

	.chip {
		min-width: 7rem;
		padding: 0.35rem 1rem 0.4rem;
		border-top: 6px solid var(--orange);
		font-family: var(--font-display);
		font-size: 1.3rem;
		line-height: 1.1;
		text-align: center;
		text-transform: uppercase;
	}

	.accio {
		background: var(--lime);
		color: var(--rust);
		box-shadow: inset 0 0 0 1px var(--lime-dark);
	}

	.acte {
		background: var(--rust);
		color: var(--lime);
	}
</style>
