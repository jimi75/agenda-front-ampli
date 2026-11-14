<script>
	import { flushSync, tick, untrack } from 'svelte';
	import { formatRange } from '#lib/events.js';
	import { renderPoster } from '#lib/poster.js';
	import { downloadFile, isImageFile, shareImage, shareText, waLink } from '#lib/share.js';
	import { T } from '#lib/texts.js';
	import PosterView from './PosterView.svelte';

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
	let generating = $state(false);
	/** @typedef {'idle' | 'ready' | 'fallback' | 'failed'} ShareView */
	// Where «Comparteix» is. `ready`: the browser refused with `NotAllowedError` and the file waits
	// for a second tap. `fallback`: the image was downloaded and the text goes through the `wa.me`
	// link. `failed`: the image could not be generated; only the `wa.me` link is offered.
	let shareView = $state(/** @type {ShareView} */ ('idle'));
	/** The system share panel is open. */
	let sharing = $state(false);
	/** The generated file, kept only while `shareView` is `ready`. @type {File | null} */
	let readyFile = null;
	/** Changes whenever the detail closes or shows another event, so a late result is dropped. */
	let epoch = 0;
	/** @typedef {'idle' | 'picking' | 'ready' | 'failed'} CustomImageView */
	/** @typedef {{ epoch: number, token: number, input?: HTMLInputElement }} PickerDescriptor */
	/** @typedef {{ epoch: number, token: number }} CustomFlight */
	let customImageView = $state(/** @type {CustomImageView} */ ('idle'));
	/**
	 * The chosen original file, kept only while «Comparteix amb la imatge pròpia» waits for its tap.
	 * `second` marks the single deliberate retry after a `NotAllowedError`.
	 * @type {{ file: File, second: boolean } | null}
	 */
	let customReady = null;
	let customToken = 0;
	/** @type {PickerDescriptor | null} */
	let picker = $state.raw(null);
	/** Owns `sharing` cleanup until this custom system-share call settles. @type {CustomFlight | null} */
	let customFlight = null;
	/** @type {HTMLButtonElement | undefined} */
	let customButton = $state();
	let previouslyEligible = false;
	let posterVisible = $state(false);
	/** @type {HTMLElement | undefined} */
	let posterNode = $state();
	const visible = $derived(event !== null || notFound);
	const canShare = $derived(participation === 'open' || participation === 'closed' || participation === 'external');
	const busy = $derived(generating || sharing);
	const showWaLink = $derived(shareView === 'fallback' || shareView === 'failed');
	const text = $derived(event ? shareText(event, dateLabel, url) : '');

	function clearPicker() {
		if (picker?.input) {
			picker.input.value = '';
			picker.input = undefined;
		}
		picker = null;
	}

	function resetShare() {
		epoch++;
		customToken++;
		clearPicker();
		customImageView = 'idle';
		customReady = null;
		customFlight = null;
		readyFile = null;
		shareView = 'idle';
		generating = false;
		sharing = false;
		posterVisible = false;
	}

	// The parent owns "which event is open"; this effect keeps the native dialog in sync.
	$effect(() => {
		if (!dialog) return;
		if (visible && !dialog.open) {
			untrack(resetShare);
			dialog.showModal();
			tick().then(() => closeButton?.focus());
		} else if (!visible && dialog.open) {
			dialog.close();
		}
	});

	// Another event in the same open dialog: nothing of the previous one is kept.
	/** @type {string | null} */
	let resetEventId = null;
	$effect(() => {
		const id = event?.id ?? null;
		if (id === resetEventId) return;
		resetEventId = id;
		untrack(resetShare);
	});

	$effect(() => {
		const eligible = canShare;
		if (previouslyEligible && !eligible) {
			untrack(() => {
				customToken++;
				clearPicker();
				customImageView = 'idle';
				customReady = null;
			});
		}
		previouslyEligible = eligible;
	});

	function handleClose() {
		resetShare();
		onclose();
	}

	/**
	 * Renders the image of the open event. The poster is mounted only while it is generated.
	 * Returns `null` if it failed, or if the detail closed meanwhile (nothing is shown then).
	 * @returns {Promise<{ file: File | null, stale: boolean }>}
	 */
	async function generate() {
		const token = epoch;
		generating = true;
		posterVisible = true;
		try {
			await tick();
			if (!posterNode || !event) throw new Error('image_failed');
			return { file: await renderPoster(posterNode, event.id), stale: token !== epoch };
		} catch {
			return { file: null, stale: token !== epoch };
		} finally {
			if (token === epoch) {
				posterVisible = false;
				generating = false;
			}
		}
	}

	/** @param {File} file */
	function fallbackWithDownload(file) {
		downloadFile(file);
		shareView = 'fallback';
	}

	function invalidateCustomForPrimary() {
		customToken++;
		clearPicker();
		customImageView = 'idle';
		customReady = null;
	}

	/** First tap: generates the image and shares it. */
	async function shareFirst() {
		if (!event) return;
		shareView = 'idle';
		const { file, stale } = await generate();
		if (stale) return;
		if (!file) {
			shareView = 'failed';
			return;
		}
		const token = epoch;
		sharing = true;
		const outcome = await shareImage(file, text);
		if (token !== epoch) return;
		sharing = false;
		if (outcome === 'needs-second-tap') {
			readyFile = file;
			shareView = 'ready';
		} else if (outcome === 'unsupported' || outcome === 'error') {
			fallbackWithDownload(file);
		}
	}

	/** Second tap: `shareImage` is called with no `await` before it, so the tap keeps its activation. */
	function shareSecond() {
		const file = readyFile;
		if (!file) return;
		const token = epoch;
		const pending = shareImage(file, text, { second: true });
		readyFile = null;
		shareView = 'idle';
		sharing = true;
		pending.then((outcome) => {
			if (token !== epoch) return;
			sharing = false;
			if (outcome === 'unsupported' || outcome === 'error') fallbackWithDownload(file);
		});
	}

	function share() {
		if (busy || !event) return;
		invalidateCustomForPrimary();
		if (shareView === 'ready') shareSecond();
		else shareFirst();
	}

	/** @param {PickerDescriptor} descriptor */
	function isCurrentPicker(descriptor) {
		return (
			picker !== null &&
			picker.epoch === descriptor.epoch &&
			picker.token === descriptor.token &&
			descriptor.epoch === epoch &&
			descriptor.token === customToken &&
			dialog?.open === true &&
			event !== null &&
			canShare
		);
	}

	/**
	 * First tap opens the picker; choosing a file only prepares it. The next tap shares it, because
	 * mobile browsers drop the tap's activation while their native picker is open.
	 */
	function customImage() {
		if (!dialog?.open || !event || !canShare || generating || sharing) return;
		if (customImageView === 'ready') {
			const ready = customReady;
			if (!ready) return;
			customToken++;
			const token = customToken;
			customReady = null;
			customImageView = 'idle';
			startCustomShare(ready.file, token, ready.second);
			return;
		}

		customToken++;
		const descriptor = /** @type {PickerDescriptor} */ ({ epoch, token: customToken });
		customReady = null;
		customImageView = 'picking';
		try {
			flushSync(() => {
				picker = descriptor;
			});
		} catch {
			if (descriptor.epoch === epoch && descriptor.token === customToken) {
				clearPicker();
				customImageView = 'failed';
			}
			return;
		}
		if (!isCurrentPicker(descriptor)) return;
		try {
			if (!descriptor.input) throw new Error('picker_unavailable');
			descriptor.input.click();
		} catch {
			if (isCurrentPicker(descriptor)) {
				clearPicker();
				customImageView = 'failed';
			}
		}
	}

	/** @param {PickerDescriptor} descriptor */
	function cancelPicker(descriptor) {
		if (!isCurrentPicker(descriptor)) return;
		if (descriptor.input) descriptor.input.value = '';
		descriptor.input = undefined;
		picker = null;
		customImageView = 'idle';
		if (dialog?.open && event && canShare && descriptor.epoch === epoch) customButton?.focus();
	}

	/** @param {PickerDescriptor} descriptor */
	function changePicker(descriptor) {
		if (!isCurrentPicker(descriptor) || busy) return;
		const input = descriptor.input;
		const file = input?.files?.[0] ?? null;
		if (input) input.value = '';
		descriptor.input = undefined;
		picker = null;

		if (!file) {
			customImageView = 'idle';
			if (dialog?.open && event && canShare && descriptor.epoch === epoch) customButton?.focus();
			return;
		}
		if (!isImageFile(file)) {
			customReady = null;
			customImageView = 'failed';
			return;
		}

		readyFile = null;
		shareView = 'idle';
		customReady = { file, second: false };
		customImageView = 'ready';
		customButton?.focus();
	}

	/**
	 * Calls the system API immediately from the button tap, retaining only this flight's cleanup identity.
	 * @param {File} file @param {number} token @param {boolean} second
	 */
	function startCustomShare(file, token, second) {
		const flight = { epoch, token };
		customFlight = flight;
		sharing = true;
		const pending = shareImage(file, text, second ? { second: true } : undefined);
		pending.then(
			(outcome) => settleCustomShare(flight, file, second, outcome),
			() => settleCustomShare(flight, file, second, 'error')
		);
	}

	/**
	 * Busy cleanup belongs to the flight; rendering its outcome additionally requires current UI state.
	 * @param {CustomFlight} flight @param {File} file @param {boolean} second
	 * @param {'shared' | 'aborted' | 'needs-second-tap' | 'unsupported' | 'error'} outcome
	 */
	function settleCustomShare(flight, file, second, outcome) {
		if (flight.epoch === epoch && customFlight === flight) {
			customFlight = null;
			sharing = false;
		}
		if (
			flight.epoch !== epoch ||
			flight.token !== customToken ||
			!dialog?.open ||
			!event ||
			!canShare
		) {
			return;
		}

		customReady = null;
		if (!second && outcome === 'needs-second-tap') {
			customReady = { file, second: true };
			customImageView = 'ready';
		} else if (outcome === 'unsupported' || outcome === 'error') {
			customImageView = 'failed';
		} else {
			customImageView = 'idle';
		}
	}

	/** @param {MouseEvent} clickEvent */
	function closeOnBackdrop(clickEvent) {
		if (clickEvent.target === dialog) dialog?.close();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} aria-labelledby="detail-title" onclose={handleClose} onclick={closeOnBackdrop}>
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
				{#if event.manager}
					<p class="manager">{T.card.manager(event.manager)}</p>
				{/if}

				<section>
					<h3>{T.detail.participation}</h3>
					{#if participation !== 'external'}<p class="count">{T.count(names.length)}</p>{/if}
					{#if participation === 'open'}
						<button type="button" class="primary" onclick={() => onparticipate(event.id)}>
							{T.participate}
						</button>
					{:else if participation === 'external'}
						<a class="primary" href={event.externalUrl} target="_blank" rel="noopener noreferrer"
							>{T.participate}<span class="sr-only"> {T.newTab}</span></a
						>
						<p class="note">{T.detail.externalNote}</p>
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
						<button type="button" class="action" disabled={busy} onclick={share}>
							{generating
								? T.share.generating
								: shareView === 'ready'
									? T.share.ready
									: T.share.share}
						</button>
						<div class="custom-row">
							<button
								type="button"
								class="custom-action"
								bind:this={customButton}
								disabled={busy}
								onclick={customImage}
							>
								{customImageView === 'ready' ? T.share.customShare : T.share.customImage}
							</button>
						</div>
						{#if picker}
							{@const descriptor = picker}
							{#key descriptor.token}
								<input
									class="custom-file-input"
									type="file"
									accept="image/*,.jpg,.jpeg,.png,.gif,.webp"
									tabindex="-1"
									aria-hidden="true"
									bind:this={descriptor.input}
									oncancel={() => cancelPicker(descriptor)}
									onchange={() => changePicker(descriptor)}
								/>
							{/key}
						{/if}
						{#if showWaLink}
							<a class="action" href={waLink(text)} target="_blank" rel="noopener noreferrer"
								>{T.share.waLink}<span class="sr-only"> {T.newTab}</span></a
							>
						{/if}
						<p class="live" aria-live="polite">
							{#if customImageView === 'failed'}
								{T.share.customFailed}
							{:else if customImageView === 'ready'}
								<span class="sr-only">{T.share.customChosen}</span>
							{:else if shareView === 'ready'}
								<span class="sr-only">{T.share.ready}</span>
							{:else if shareView === 'failed'}
								{T.share.imageFailed}
							{:else if shareView === 'fallback'}
								{T.share.fallbackNote}
							{/if}
						</p>
					</section>
				{/if}
			{:else}
				<p id="detail-title" class="not-found">{T.detail.notFound}</p>
			{/if}
		</div>
		{#if event && posterVisible}
			<PosterView {event} {dateLabel} bind:node={posterNode} />
		{/if}
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

	/* From 1024px the detail is a centred panel, so it does not stretch across a wide screen. */
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

	.manager {
		margin: 0.4rem 0 0;
		color: var(--rust);
		overflow-wrap: anywhere;
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
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		padding: 0 1.2rem;
		border: 0;
		border-radius: 4px;
		background: var(--rust);
		color: var(--lime);
		font: 700 1.05rem/1 var(--font-text);
		text-decoration: none;
		cursor: pointer;
	}

	.primary + .note {
		margin-top: 0.6rem;
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

	.action:disabled {
		opacity: 0.6;
		cursor: progress;
	}

	.custom-row {
		flex-basis: 100%;
	}

	.custom-action {
		min-height: 44px;
		padding: 0 0.1rem;
		border: 0;
		background: transparent;
		color: var(--rust);
		font: 700 0.95rem/1.2 var(--font-text);
		text-align: left;
		text-decoration: underline;
		text-underline-offset: 0.18em;
		cursor: pointer;
	}

	.custom-file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.live {
		flex-basis: 100%;
		min-height: 1.2em;
		margin: 0;
		font-weight: 600;
	}

</style>
