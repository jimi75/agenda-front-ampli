<script>
	import { tick } from 'svelte';
	import { MAX_NAME_LENGTH } from '#lib/config.js';
	import { formatRange } from '#lib/events.js';
	import { validateName } from '#lib/names.js';
	import { T } from '#lib/texts.js';

	/**
	 * @type {{
	 *   event: import('#lib/events.js').AgendaEvent | null,
	 *   dateLabel: string,
	 *   features: string[],
	 *   mine: import('#lib/my-signups.js').MySignup[],
	 *   onsubmit: (name: string) => Promise<import('#lib/api.js').SignupResult>,
	 *   onunsign: (eventId: string, requestId: string) => Promise<import('#lib/api.js').UnsignResult>,
	 *   onclose: () => void
	 * }}
	 */
	let { event, dateLabel, features, mine, onsubmit, onunsign, onclose } = $props();

	const CONFIRM_MS = 5000;

	/** @type {HTMLDialogElement | undefined} */
	let dialog = $state();
	/** @type {HTMLInputElement | undefined} */
	let input = $state();
	let name = $state('');
	/** @type {'idle' | 'sending' | 'done'} */
	let phase = $state('idle');
	let error = $state('');
	/** The record whose «Desapuntar-me» is waiting for the second tap. */
	let confirming = $state('');
	/** The record being removed: while set, no other removal starts. */
	let unsigning = $state('');
	let unsignMessage = $state('');
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let confirmTimer;
	// Bumped on every open: the answer of a removal started in an earlier opening is ignored.
	let opening = 0;

	const showMine = $derived(features.includes('unsignup') && (mine.length > 0 || unsignMessage !== ''));

	function clearConfirm() {
		clearTimeout(confirmTimer);
		confirming = '';
	}

	// The parent owns "which event is open"; this effect keeps the native dialog in sync.
	$effect(() => {
		if (!dialog) return;
		if (event && !dialog.open) {
			opening += 1;
			name = '';
			phase = 'idle';
			error = '';
			unsigning = '';
			unsignMessage = '';
			clearConfirm();
			dialog.showModal();
			tick().then(() => input?.focus());
		} else if (!event && dialog.open) {
			dialog.close();
		}
	});

	$effect(() => () => clearTimeout(confirmTimer));

	/** @param {string} requestId */
	async function unsign(requestId) {
		const eventId = event?.id;
		if (!eventId || unsigning) return;
		if (confirming !== requestId) {
			clearConfirm();
			confirming = requestId;
			confirmTimer = setTimeout(() => (confirming = ''), CONFIRM_MS);
			return;
		}
		clearConfirm();
		unsigning = requestId;
		unsignMessage = '';
		const current = opening;
		const result = await onunsign(eventId, requestId);
		if (current !== opening) return;
		unsigning = '';
		if (!result.ok) {
			unsignMessage = T.signupErrors[result.error] ?? T.signupErrors.server;
		} else {
			unsignMessage = result.removed ? T.participation.unsignDone : T.participation.alreadyGone;
		}
	}

	/** @param {SubmitEvent} submitEvent */
	async function submit(submitEvent) {
		submitEvent.preventDefault();
		if (phase !== 'idle') return;
		const check = validateName(name);
		if (!check.ok) {
			error = T.signupErrors[check.error];
			input?.focus();
			return;
		}
		phase = 'sending';
		error = '';
		const result = await onsubmit(check.name);
		if (result.ok) {
			phase = 'done';
			name = '';
		} else {
			phase = 'idle';
			error = T.signupErrors[result.error] ?? T.signupErrors.server;
			input?.focus();
		}
	}

	/** @param {MouseEvent} clickEvent */
	function closeOnBackdrop(clickEvent) {
		if (clickEvent.target === dialog) dialog?.close();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} aria-labelledby="signup-title" {onclose} onclick={closeOnBackdrop}>
	{#if event}
		<div class="panel">
			<div class="top">
				<div>
					<p class="type {event.type}">{T.types[event.type]}</p>
					<h2 id="signup-title">{event.name}</h2>
					<p class="when">{dateLabel} · {formatRange(event.start, event.end)}</p>
					{#if event.place}<p class="where">{event.place}</p>{/if}
				</div>
				<button type="button" class="close" onclick={() => dialog?.close()}>
					{T.dialog.close}
				</button>
			</div>

			<p class="purpose">{T.dialog.purpose}</p>
			{#if phase === 'done'}
				<p class="success" role="status">{T.dialog.success}</p>
				{#if features.includes('unsignup')}<p class="hint">{T.participation.hint}</p>{/if}
			{:else}
				<form onsubmit={submit} novalidate>
					<label for="signup-name">{T.dialog.nameLabel}</label>
					<input
						id="signup-name"
						type="text"
						bind:this={input}
						bind:value={name}
						maxlength={MAX_NAME_LENGTH}
						autocomplete="nickname"
						autocapitalize="words"
						enterkeyhint="send"
						disabled={phase === 'sending'}
						aria-describedby="signup-privacy"
						aria-invalid={error ? 'true' : undefined}
					/>
					<p id="signup-privacy" class="privacy">{T.dialog.privacy}</p>
					<p class="error" role="alert">{error}</p>
					<button type="submit" class="submit" disabled={phase === 'sending'}>
						{phase === 'sending' ? T.dialog.sending : T.dialog.submit}
					</button>
				</form>
			{/if}
			{#if showMine}
				<section class="mine" aria-labelledby="mine-title">
					<h3 id="mine-title">{T.participation.mine}</h3>
					{#if unsignMessage}<p class="unsign-result" role="status">{unsignMessage}</p>{/if}
					<ul>
						{#each mine as item (item.requestId)}
							<li>
								<span class="who">{item.name}</span>
								<button
									type="button"
									class="unsign"
									class:confirm={confirming === item.requestId}
									disabled={unsigning !== ''}
									onclick={() => unsign(item.requestId)}
								>
									{unsigning === item.requestId
										? T.participation.unsigning
										: confirming === item.requestId
											? T.participation.unsignConfirm
											: T.participation.unsign}
								</button>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	{/if}
</dialog>

<style>
	dialog {
		width: calc(100% - 1rem);
		max-width: 32rem;
		margin: auto;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--ink);
	}

	dialog::backdrop {
		background: rgb(58 21 12 / 0.65);
	}

	.panel {
		max-height: calc(100dvh - 1.5rem);
		overflow: auto;
		padding: 1.1rem;
		background: var(--page);
		border-top: 8px solid var(--orange);
		border-radius: 0 0 8px 8px;
	}

	.top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.type {
		display: inline-block;
		margin: 0 0 0.35rem;
		padding: 0.1rem 0.5rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.type.accio {
		background: var(--lime);
		color: var(--rust);
		box-shadow: inset 0 0 0 1px var(--lime-dark);
	}

	.type.acte {
		background: var(--rust);
		color: var(--lime);
	}

	h2 {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 400;
		font-synthesis: none;
		font-size: 2rem;
		line-height: 1.05;
		text-transform: uppercase;
		color: var(--rust);
		overflow-wrap: anywhere;
	}

	.when,
	.where {
		margin: 0.25rem 0 0;
		font-family: var(--font-display);
		font-size: 1.2rem;
		line-height: 1.15;
		color: var(--rust);
	}

	.close {
		flex: none;
		min-width: 44px;
		min-height: 44px;
		padding: 0 0.8rem;
		border: 2px solid var(--rust);
		border-radius: 4px;
		background: transparent;
		color: var(--rust);
		font: 700 0.9rem/1 var(--font-text);
		cursor: pointer;
	}

	.purpose {
		margin: 1rem 0 0.75rem;
		font-weight: 600;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	label {
		font-weight: 700;
	}

	input {
		width: 100%;
		min-height: 48px;
		padding: 0 0.75rem;
		border: 2px solid var(--rust);
		border-radius: 4px;
		background: #fff;
		color: var(--ink);
		font: 500 1.125rem/1.2 var(--font-text);
	}

	input[aria-invalid='true'] {
		border-color: var(--orange);
		box-shadow: inset 0 0 0 1px var(--orange);
	}

	.privacy {
		margin: 0;
		font-size: 0.85rem;
	}

	.error {
		min-height: 1.2em;
		margin: 0;
		font-weight: 700;
		color: var(--rust);
	}

	.submit {
		min-height: 48px;
		border: 0;
		border-radius: 4px;
		background: var(--rust);
		color: var(--lime);
		font: 700 1.05rem/1 var(--font-text);
		cursor: pointer;
	}

	.submit:disabled {
		opacity: 0.7;
		cursor: progress;
	}

	.success {
		margin: 0.75rem 0 0;
		padding: 0.7rem 0.8rem;
		background: var(--lime);
		border-left: 6px solid var(--rust);
		font-weight: 700;
	}

	.hint {
		margin: 0.75rem 0 0;
		font-size: 0.85rem;
	}

	.mine {
		margin-top: 1.25rem;
		padding-top: 0.9rem;
		border-top: 2px solid var(--rust);
	}

	h3 {
		margin: 0 0 0.5rem;
		font-family: var(--font-display);
		font-weight: 400;
		font-synthesis: none;
		font-size: 1.3rem;
		text-transform: uppercase;
		color: var(--rust);
	}

	.unsign-result {
		margin: 0 0 0.5rem;
		font-weight: 700;
		color: var(--rust);
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.3rem 0;
	}

	.who {
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.unsign {
		flex: none;
		min-height: 44px;
		padding: 0 0.9rem;
		border: 2px solid var(--rust);
		border-radius: 4px;
		background: transparent;
		color: var(--rust);
		font: 700 0.9rem/1 var(--font-text);
		cursor: pointer;
	}

	.unsign.confirm {
		background: var(--rust);
		color: var(--lime);
	}

	.unsign:disabled {
		opacity: 0.7;
		cursor: progress;
	}
</style>
