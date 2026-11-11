<script>
	import { formatRange } from '#lib/events.js';
	import { T } from '#lib/texts.js';

	/**
	 * @type {{
	 *   event: import('#lib/events.js').AgendaEvent,
	 *   count: number,
	 *   dateLabel: string,
	 *   state: import('#lib/state.js').ParticipationState,
	 *   ondetail: (id: string) => void,
	 *   onparticipate: (id: string) => void
	 * }}
	 */
	let { event, count, dateLabel, state, ondetail, onparticipate } = $props();

	/** Only a plain click opens the detail here; Ctrl, Cmd, Shift and middle click keep the browser's own behaviour. @param {MouseEvent} click */
	function openDetail(click) {
		if (click.button !== 0 || click.ctrlKey || click.metaKey || click.shiftKey || click.altKey) return;
		click.preventDefault();
		ondetail(event.id);
	}
</script>

<article class="event {event.type}" class:past={state === 'past'} class:cancelled={state === 'cancelled'}>
	<p class="tags">
		<span class="type">{T.types[event.type]}</span>
		{#if event.status}<span class="status">{T.status[event.status]}</span>{/if}
		<a
			class="detail"
			href="?e={encodeURIComponent(event.id)}"
			aria-label={T.card.detailLabel(event.name, dateLabel)}
			onclick={openDetail}>{T.card.detail}</a
		>
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
			aria-label={state === 'open'
				? T.participateLabel(event.name, dateLabel)
				: T.viewSignupsLabel(event.name, dateLabel)}
			onclick={() => (state === 'open' ? onparticipate(event.id) : ondetail(event.id))}
		>
			{state === 'open' ? T.participate : T.viewSignups}
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

	/* Resets what .tags gives the type label: this is a link in body text. The padding is an invisible touch target. */
	.detail {
		margin: -0.3rem 0 -0.3rem auto;
		padding: 0.3rem 0 0.3rem 0.4rem;
		font-size: 1rem;
		font-weight: 400;
		letter-spacing: normal;
		text-transform: none;
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 0.18em;
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
