<script>
	import { T } from '#lib/texts.js';
</script>

<header class="hero">
	<h1>
		<span class="line">Agenda Frontamplista</span>
		<span class="line">Sants-Montjuïc</span>
	</h1>
	<p class="month">{T.monthLabel}</p>
</header>

<style>
	.hero {
		background: var(--orange);
		color: var(--lime-light);
		padding: 1.75rem 1rem 1.5rem;
		text-align: center;
	}

	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 400;
		font-synthesis: none;
		text-transform: uppercase;
		font-size: clamp(2.6rem, 9vw, 5.5rem);
		line-height: 0.95;
		letter-spacing: 0.01em;
	}

	.line {
		display: block;
	}

	/* 24px minimum: the lime-light on orange pair (3.62:1) only passes as "large text". */
	.month {
		margin: 0.75rem 0 0;
		font-family: var(--font-display);
		text-transform: uppercase;
		font-size: clamp(1.5rem, 4vw, 2.2rem);
		line-height: 1;
	}
</style>
