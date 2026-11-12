<script>
	import { formatRange } from '#lib/events.js';
	import { T } from '#lib/texts.js';

	/**
	 * @type {{
	 *   event: import('#lib/events.js').AgendaEvent,
	 *   count: number,
	 *   dateLabel: string,
	 *   state: import('#lib/state.js').ParticipationState,
	 *   mine: import('#lib/my-signups.js').MySignup[],
	 *   canUnsign: boolean,
	 *   ondetail: (id: string) => void,
	 *   onparticipate: (id: string) => void,
	 *   onunsign: (eventId: string, requestId: string) => Promise<import('#lib/api.js').UnsignResult>
	 * }}
	 */
	let { event, count, dateLabel, state: participation, mine, canUnsign, ondetail, onparticipate, onunsign } = $props();

	const CONFIRM_MS = 5000;

	let confirming = $state(false);
	let unsigning = $state(false);
	let message = $state('');
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let confirmTimer;
	let destroyed = false;

	const showUnsign = $derived(participation === 'open' && canUnsign && mine.length > 0);

	$effect(() => () => {
		destroyed = true;
		clearTimeout(confirmTimer);
	});

	// A confirmation must not outlive the offer (the record is gone or the event closed).
	$effect(() => {
		if (!showUnsign) clearConfirm();
	});

	function clearConfirm() {
		clearTimeout(confirmTimer);
		confirming = false;
	}

	/** One own record is removed here with two taps; with several, the modal lists them. */
	async function unsign() {
		if (unsigning) return;
		if (mine.length !== 1) {
			clearConfirm();
			onparticipate(event.id);
			return;
		}
		if (!confirming) {
			message = '';
			confirming = true;
			confirmTimer = setTimeout(() => (confirming = false), CONFIRM_MS);
			return;
		}
		clearConfirm();
		unsigning = true;
		const result = await onunsign(event.id, mine[0].requestId);
		if (destroyed) return;
		unsigning = false;
		if (!result.ok) {
			message = T.signupErrors[result.error] ?? T.signupErrors.server;
		} else {
			message = result.removed ? T.participation.unsignDone : T.participation.alreadyGone;
		}
	}

	/** Only a plain click opens the detail here; Ctrl, Cmd, Shift and middle click keep the browser's own behaviour. @param {MouseEvent} click */
	function openDetail(click) {
		if (click.button !== 0 || click.ctrlKey || click.metaKey || click.shiftKey || click.altKey) return;
		click.preventDefault();
		ondetail(event.id);
	}
</script>

<article class="event {event.type}" class:past={participation === 'past'} class:cancelled={event.status === 'cancelled'}>
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
	{#if event.manager}
		<p class="manager">{T.card.manager(event.manager)}</p>
	{/if}
	<div class="actions">
		{#if participation === 'external'}
			<a
				class="button"
				href={event.externalUrl}
				target="_blank"
				rel="noopener noreferrer"
				aria-label="{T.participateLabel(event.name, dateLabel)} {T.newTab}">{T.participate}</a
			>
		{:else}
			<p class="count">{T.count(count)}</p>
			{#if showUnsign}
				<button
					type="button"
					class="unsign"
					class:confirm={confirming}
					aria-label={T.unsignLabel(event.name, dateLabel)}
					disabled={unsigning}
					onclick={unsign}
				>
					{unsigning
						? T.participation.unsigning
						: confirming
							? T.participation.unsignConfirm
							: T.participation.unsign}
				</button>
			{:else}
				<button
					type="button"
					aria-label={participation === 'open'
						? T.participateLabel(event.name, dateLabel)
						: T.viewSignupsLabel(event.name, dateLabel)}
					onclick={() => (participation === 'open' ? onparticipate(event.id) : ondetail(event.id))}
				>
					{participation === 'open' ? T.participate : T.viewSignups}
				</button>
			{/if}
		{/if}
	</div>
	<p class="unsign-result" role="status">{message}</p>
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
		align-items: center;
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
		color: inherit;
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

	.manager {
		margin: 0.1rem 0 0;
		font-size: 0.9rem;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem 0.6rem;
		margin-top: 0.5rem;
	}

	.actions:has(:only-child) { justify-content: right } 

	.count {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
	}

	button,
	.button {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 0.95rem;
		border: 0;
		border-radius: 4px;
		background: var(--badge-bg);
		color: var(--badge-fg);
		font: 700 0.95rem/1 var(--font-text);
		text-decoration: none;
		cursor: pointer;
	}

	.unsign-result {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 700;
	}

	button.unsign {
		border: 2px solid currentColor;
		background: transparent;
		color: inherit;
	}

	button.unsign.confirm {
		border-color: var(--badge-bg);
		background: var(--badge-bg);
		color: var(--badge-fg);
	}

	button.unsign:disabled {
		opacity: 0.7;
		cursor: progress;
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

		button,
		.button {
			padding: 0 0.6rem;
			font-size: 0.85rem;
		}
	}
</style>
