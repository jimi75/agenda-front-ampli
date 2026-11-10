<script>
	import { formatRange } from '#lib/events.js';
	import { T } from '#lib/texts.js';

	/**
	 * @type {{
	 *   event: import('#lib/events.js').AgendaEvent,
	 *   count: number,
	 *   dateLabel: string,
	 *   past: boolean,
	 *   signupsOpen: boolean,
	 *   onselect: (id: string) => void
	 * }}
	 */
	let { event, count, dateLabel, past, signupsOpen, onselect } = $props();

	const cancelled = $derived(event.status === 'cancelled');
	const canSignup = $derived(signupsOpen && !past && !cancelled);
</script>

<article class="event {event.type}" class:past class:cancelled>
	<p class="tags">
		<span class="type">{T.types[event.type]}</span>
		{#if event.status}<span class="status">{T.status[event.status]}</span>{/if}
	</p>
	<h3 class="name">{event.name}</h3>
	<p class="time">{formatRange(event.start, event.end)}</p>
	{#if event.place}
		<p class="place">
			{#if event.mapUrl}
				<a href={event.mapUrl} target="_blank" rel="noopener noreferrer" title={T.mapTitle}
					>{event.place}<span class="sr-only"> {T.newTab}</span></a
				>
			{:else}
				{event.place}
			{/if}
		</p>
	{/if}
	<div class="actions">
		<p class="count">{T.count(count)}</p>
		<button
			type="button"
			aria-label={canSignup
				? T.participateLabel(event.name, dateLabel)
				: T.viewSignupsLabel(event.name, dateLabel)}
			onclick={() => onselect(event.id)}
		>
			{canSignup ? T.participate : T.viewSignups}
		</button>
	</div>
</article>

<style>
	.event {
		--badge-bg: var(--rust);
		--badge-fg: var(--lime);
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.6rem 0.75rem 0.75rem;
		border-top: 6px solid var(--orange);
	}

	.accio {
		background: var(--lime);
		color: var(--rust);
		box-shadow: inset 0 0 0 1px var(--lime-dark);
	}

	.acte {
		--badge-bg: var(--lime);
		--badge-fg: var(--rust);
		background: var(--rust);
		color: var(--lime);
	}

	.past {
		filter: grayscale(0.8);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		line-height: 1.2;
		text-transform: uppercase;
	}

	.status {
		padding: 0 0.4rem;
		border-radius: 2px;
		background: var(--badge-bg);
		color: var(--badge-fg);
	}

	.name,
	.time,
	.place {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 400;
		font-synthesis: none;
		overflow-wrap: anywhere;
	}

	.name {
		margin-top: 0.2rem;
		font-size: 1.55rem;
		line-height: 1.05;
		text-transform: uppercase;
	}

	.cancelled .name {
		text-decoration: line-through;
		text-decoration-thickness: 2px;
	}

	.time {
		font-size: 1.3rem;
		line-height: 1.15;
	}

	.place {
		font-size: 1.15rem;
		line-height: 1.2;
	}

	.place a {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 0.18em;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem 0.6rem;
		margin-top: 0.5rem;
	}

	.count {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
	}

	button {
		min-height: 44px;
		padding: 0 0.95rem;
		border: 0;
		border-radius: 4px;
		background: var(--badge-bg);
		color: var(--badge-fg);
		font: 700 0.95rem/1 var(--font-text);
		cursor: pointer;
	}

	/* The grid starts at 1024px, where each day column is only about 140px wide. */
	@media (min-width: 1024px) and (max-width: 1279px) {
		.event {
			padding: 0.5rem 0.5rem 0.6rem;
		}

		.name {
			font-size: 1.2rem;
		}

		.time {
			font-size: 1.1rem;
		}

		.place {
			font-size: 1rem;
		}

		button {
			padding: 0 0.6rem;
			font-size: 0.85rem;
		}
	}
</style>
