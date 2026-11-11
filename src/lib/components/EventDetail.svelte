<script>
	import { tick } from 'svelte';
	import { formatRange } from '#lib/events.js';
	import { copyText, shareText, waLink } from '#lib/share.js';
	import { T } from '#lib/texts.js';

	/**
	 * @type {{
	 *   event: import('#lib/events.js').AgendaEvent | null,
	 *   names: string[],
	 *   state: import('#lib/state.js').ParticipationState | null,
	 *   dateLabel: string,
	 *   url: string,
	 *   notFound: boolean,
	 *   onclose: () => void,
	 *   onparticipate: (id: string) => void
	 * }}
	 */
	// `state` is the public prop name; locally it is `participation` because `$state` would clash with it.
	let { event, names, state: participation, dateLabel, url, notFound, onclose, onparticipate } = $props();

	/** @type {HTMLDialogElement | undefined} */
	let dialog = $state();
	/** @type {HTMLButtonElement | undefined} */
	let closeButton = $state();
	/** @type {HTMLInputElement | undefined} */
	let linkField = $state();
	/** @type {'idle' | 'copied' | 'failed'} */
	let copyState = $state('idle');

	const visible = $derived(event !== null || notFound);
	const canShare = $derived(participation === 'open' || participation === 'closed' || participation === 'external');

	// The parent owns "which event is open"; this effect keeps the native dialog in sync.
	$effect(() => {
		if (!dialog) return;
		if (visible && !dialog.open) {
			copyState = 'idle';
			dialog.showModal();
			tick().then(() => closeButton?.focus());
		} else if (!visible && dialog.open) {
			dialog.close();
		}
	});

	async function copy() {
		copyState = (await copyText(url)) ? 'copied' : 'failed';
		if (copyState === 'failed') {
			await tick();
			linkField?.focus();
			linkField?.select();
		}
	}

	/** @param {MouseEvent} clickEvent */
	function closeOnBackdrop(clickEvent) {
		if (clickEvent.target === dialog) dialog?.close();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} aria-labelledby="detail-title" {onclose} onclick={closeOnBackdrop}>
	{#if event || notFound}
		<div class="panel">
			<div class="top">
				{#if event}
					<p class="tags">
						<span class="type {event.type}">{T.types[event.type]}</span>
						{#if event.status}<span class="status">{T.status[event.status]}</span>{/if}
					</p>
				{/if}
				<button type="button" class="close" bind:this={closeButton} onclick={() => dialog?.close()}>
					{T.detail.close}
				</button>
			</div>

			{#if event}
				<h2 id="detail-title" class:cancelled={event.status === 'cancelled'}>{event.name}</h2>
				<p class="when">{dateLabel} · {formatRange(event.start, event.end)}</p>
				{#if event.place}
					<p class="where">
						{#if event.mapUrl}
							<a href={event.mapUrl} target="_blank" rel="noopener noreferrer" title={T.mapTitle}
								>{event.place}<span class="sr-only"> {T.newTab}</span></a
							>
						{:else}
							{event.place}
						{/if}
					</p>
				{/if}

				<section>
					<h3>{T.detail.participation}</h3>
					{#if participation !== 'external'}<p class="count">{T.count(names.length)}</p>{/if}
					{#if participation === 'open'}
						<button type="button" class="primary" onclick={() => onparticipate(event.id)}>
							{T.participate}
						</button>
					{:else if participation === 'closed'}
						<p class="note">{T.dialog.closed}</p>
					{:else if participation === 'past'}
						<p class="note">{T.dialog.pastNote}</p>
					{:else if participation === 'cancelled'}
						<p class="note">{T.dialog.cancelledNote}</p>
					{/if}
				</section>

				{#if participation !== 'external'}
					<section>
						<h3>{T.detail.listTitle}</h3>
						{#if names.length === 0}
							<p class="empty">{T.detail.listEmpty}</p>
						{:else}
							<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
							<ul class="names" tabindex="0" aria-label={T.detail.listTitle}>
								{#each names as person, i (i)}
									<li>{person}</li>
								{/each}
							</ul>
						{/if}
					</section>
				{/if}

				{#if canShare}
					<section class="share">
						<a class="action" href={waLink(shareText(url))} target="_blank" rel="noopener noreferrer"
							>{T.share.share}<span class="sr-only"> {T.newTab}</span></a
						>
						<button type="button" class="action" onclick={copy}>{T.share.copyLink}</button>
						<p class="live" aria-live="polite">
							{copyState === 'copied' ? T.share.copied : copyState === 'failed' ? T.share.copyFailed : ''}
						</p>
						{#if copyState === 'failed'}
							<input
								bind:this={linkField}
								class="link-field"
								type="text"
								readonly
								value={url}
								aria-label={T.share.copyLink}
								onfocus={(focusEvent) => /** @type {HTMLInputElement} */ (focusEvent.currentTarget).select()}
							/>
						{/if}
					</section>
				{/if}
			{:else}
				<p id="detail-title" class="not-found">{T.detail.notFound}</p>
			{/if}
		</div>
	{/if}
</dialog>

<style>
	/* Below 1024px the detail is the whole screen. */
	dialog {
		width: 100dvw;
		height: 100dvh;
		max-width: none;
		max-height: none;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--ink);
	}

	dialog::backdrop {
		background: rgb(58 21 12 / 0.65);
	}

	.panel {
		height: 100%;
		overflow: auto;
		padding: 1.1rem;
		background: var(--page);
		border-top: 8px solid var(--orange);
	}

	@media (min-width: 1024px) {
		dialog {
			width: min(40rem, calc(100% - 2rem));
			height: fit-content;
			margin: auto;
		}

		.panel {
			height: auto;
			max-height: calc(100dvh - 4rem);
			border-radius: 0 0 8px 8px;
		}
	}

	.top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0 0 0.35rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		line-height: 1.2;
		text-transform: uppercase;
	}

	.type,
	.status {
		padding: 0.1rem 0.5rem;
	}

	.type.accio {
		background: var(--lime);
		color: var(--rust);
		box-shadow: inset 0 0 0 1px var(--lime-dark);
	}

	.type.acte,
	.status {
		background: var(--rust);
		color: var(--lime);
	}

	.status {
		border-radius: 2px;
	}

	h2 {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 400;
		font-synthesis: none;
		font-size: 2.2rem;
		line-height: 1.05;
		text-transform: uppercase;
		color: var(--rust);
		overflow-wrap: anywhere;
	}

	h2.cancelled {
		text-decoration: line-through;
		text-decoration-thickness: 2px;
	}

	.when,
	.where {
		margin: 0.25rem 0 0;
		font-family: var(--font-display);
		font-size: 1.3rem;
		line-height: 1.15;
		color: var(--rust);
		overflow-wrap: anywhere;
	}

	.where a {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 0.18em;
	}

	.close {
		flex: none;
		min-width: 44px;
		min-height: 44px;
		margin-left: auto;
		padding: 0 0.8rem;
		border: 2px solid var(--rust);
		border-radius: 4px;
		background: transparent;
		color: var(--rust);
		font: 700 0.9rem/1 var(--font-text);
		cursor: pointer;
	}

	section {
		margin-top: 1.1rem;
		padding-top: 0.9rem;
		border-top: 1px solid var(--lime-dark);
	}

	h3 {
		margin: 0 0 0.5rem;
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.4rem;
		color: var(--rust);
		text-transform: uppercase;
	}

	.count {
		margin: 0 0 0.6rem;
		font-weight: 600;
	}

	.primary {
		min-height: 48px;
		padding: 0 1.2rem;
		border: 0;
		border-radius: 4px;
		background: var(--rust);
		color: var(--lime);
		font: 700 1.05rem/1 var(--font-text);
		cursor: pointer;
	}

	.note,
	.not-found {
		margin: 0;
		padding: 0.6rem 0.75rem;
		background: var(--lime);
		color: var(--ink);
		border-left: 6px solid var(--orange);
		font-weight: 600;
	}

	.not-found {
		margin-top: 1rem;
	}

	.names {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		max-height: 11rem;
		margin: 0;
		padding: 0.15rem;
		overflow: auto;
		list-style: none;
	}

	.names li {
		padding: 0.25rem 0.65rem;
		background: var(--lime);
		color: var(--rust);
		font-weight: 600;
		border-radius: 999px;
		overflow-wrap: anywhere;
	}

	.empty {
		margin: 0;
	}

	.share {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
	}

	.action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0 1rem;
		border: 2px solid var(--rust);
		border-radius: 4px;
		background: transparent;
		color: var(--rust);
		font: 700 0.95rem/1 var(--font-text);
		text-decoration: none;
		cursor: pointer;
	}

	.live {
		flex-basis: 100%;
		min-height: 1.2em;
		margin: 0;
		font-weight: 600;
	}

	.link-field {
		flex-basis: 100%;
		min-height: 44px;
		padding: 0 0.75rem;
		border: 2px solid var(--rust);
		border-radius: 4px;
		background: #fff;
		color: var(--ink);
		font: 500 1rem/1.2 var(--font-text);
	}
</style>
