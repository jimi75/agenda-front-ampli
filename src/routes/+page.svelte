<script>
	import { onMount, tick } from 'svelte';
	import { createApi } from '#lib/api.js';
	import Calendar from '#lib/components/Calendar.svelte';
	import Header from '#lib/components/Header.svelte';
	import Legend from '#lib/components/Legend.svelte';
	import SignupDialog from '#lib/components/SignupDialog.svelte';
	import { groupByDate, normalizeEvents } from '#lib/events.js';
	import { buildMonth, todayIso } from '#lib/month.js';
	import { T } from '#lib/texts.js';

	const month = buildMonth();
	const API_URL = import.meta.env.VITE_AGENDA_API_URL ?? '';
	const REFRESH_AFTER_MS = 120_000;

	/**
	 * @typedef {{
	 *   events: import('#lib/events.js').AgendaEvent[],
	 *   skipped: import('#lib/events.js').SkippedRow[],
	 *   missingColumns: string[],
	 *   signups: Map<string, string[]>,
	 *   signupsOpen: boolean,
	 *   staleSince: number | null
	 * }} AgendaData
	 */

	/** @type {import('#lib/api.js').AgendaApi | null} */
	let api = null;
	/** @type {'loading' | 'ready' | 'error'} */
	let status = $state('loading');
	// The cast keeps TypeScript from narrowing `data` to `null` inside the derived values below.
	let data = $state.raw(/** @type {AgendaData | null} */ (null));
	/** @type {string | null} */
	let selectedId = $state(null);
	let today = $state('');
	let showAdmin = $state(false);
	let lastLoad = 0;

	const byDate = $derived(groupByDate(data?.events ?? []));
	const selected = $derived(data?.events.find((e) => e.id === selectedId) ?? null);
	const selectedDay = $derived(month.days.find((d) => d.date === selected?.date));
	const readOnlyReason = $derived(
		!selected
			? ''
			: selected.status === 'cancelled'
				? 'cancelled'
				: today !== '' && selected.date < today
					? 'past'
					: data?.signupsOpen === false
						? 'closed'
						: ''
	);
	const staleMinutes = $derived(
		data?.staleSince ? Math.max(0, Math.round((Date.now() - data.staleSince) / 60_000)) : 0
	);
	// The sheet has rows but none can be read: an empty calendar would read as "no events".
	const unreadable = $derived(
		!!data &&
			data.events.length === 0 &&
			(data.missingColumns.length > 0 || data.skipped.length > 0)
	);

	/** @param {import('#lib/api.js').LoadedAgenda} agenda */
	function apply(agenda) {
		const { events, skipped } = normalizeEvents(agenda.events);
		if (skipped.length) console.warn('Agenda: files ignorades', skipped);
		if (agenda.missingColumns.length) console.warn('Agenda: falten capçaleres', agenda.missingColumns);
		data = {
			events,
			skipped,
			missingColumns: agenda.missingColumns,
			signups: agenda.signups,
			signupsOpen: agenda.signupsOpen,
			staleSince: agenda.staleSince
		};
		status = 'ready';
		lastLoad = Date.now();
	}

	/** A silent refresh never replaces fresh data with an older offline copy and never shows errors. */
	async function load({ silent = false } = {}) {
		if (!api) return;
		if (!silent) status = 'loading';
		try {
			const agenda = await api.loadAgenda();
			if (silent && agenda.staleSince !== null) return;
			apply(agenda);
		} catch {
			if (!silent) status = 'error';
		}
	}

	/** On a phone the list starts at the next day with events instead of at the 1st. */
	async function anchorToUpcoming() {
		await tick();
		if (window.matchMedia('(min-width: 1024px)').matches) return;
		const withEvents = month.days.filter((d) => byDate.has(d.date));
		const next = withEvents.find((d) => d.date >= today);
		if (!next || next === withEvents[0]) return;
		document.getElementById(`dia-${next.date}`)?.scrollIntoView({ block: 'start' });
	}

	/** @param {string} id */
	function open(id) {
		selectedId = id;
		load({ silent: true });
	}

	/** @param {string} name @returns {Promise<import('#lib/api.js').SignupResult>} */
	async function signup(name) {
		const id = selectedId;
		if (!api || !id || !data) return { ok: false, error: 'server' };
		const result = await api.signup(id, name, data.signups.get(id)?.length ?? 0);
		if (result.ok) {
			data = { ...data, signups: new Map(data.signups).set(id, result.names) };
		} else if (result.error === 'closed') {
			data = { ...data, signupsOpen: false };
		}
		return result;
	}

	function refreshWhenVisible() {
		if (document.visibilityState !== 'visible' || status !== 'ready') return;
		if (Date.now() - lastLoad > REFRESH_AFTER_MS) load({ silent: true });
	}

	onMount(async () => {
		today = todayIso();
		showAdmin = new URLSearchParams(location.search).has('admin');
		if (API_URL) {
			api = createApi({ url: API_URL });
		} else if (import.meta.env.DEV) {
			api = (await import('#lib/mock-api.js')).createMockApi();
		}
		if (!api) {
			status = 'error';
			return;
		}
		await load();
		if (status === 'ready') anchorToUpcoming();
	});
</script>

<svelte:document onvisibilitychange={refreshWhenVisible} />

<Header />

<main>
	<Legend />
	<noscript><p class="notice">{T.noJs}</p></noscript>

	{#if status === 'loading'}
		<p class="notice" role="status">{T.loading}</p>
	{:else if status === 'error'}
		<div class="notice error" role="alert">
			<p><strong>{T.loadError}</strong></p>
			<p>{T.loadErrorHelp}</p>
			<button type="button" onclick={() => load()}>{T.retry}</button>
		</div>
	{:else if unreadable}
		<div class="notice error" role="alert">
			<p><strong>{T.unreadable}</strong></p>
			<button type="button" onclick={() => load()}>{T.retry}</button>
		</div>
	{/if}

	{#if data && data.staleSince !== null}
		<p class="notice" role="status">{T.staleData(staleMinutes)}</p>
	{/if}

	{#if showAdmin && data && (data.skipped.length || data.missingColumns.length)}
		<div class="notice">
			{#if data.missingColumns.length}
				<p><strong>{T.missingColumns(data.missingColumns)}</strong></p>
			{/if}
			{#if unreadable}<p>{T.allRowsSkipped}</p>{/if}
			{#if data.skipped.length}
				<p><strong>{T.skippedWarning(data.skipped.length)}</strong></p>
				<ul>
					{#each data.skipped as row (row.row)}
						<li>Fila {row.row}: {row.reason}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	{#if status !== 'error' && !unreadable}
		<Calendar
			{month}
			{byDate}
			signups={data?.signups ?? new Map()}
			{today}
			signupsOpen={data?.signupsOpen ?? true}
			onselect={open}
		/>
		{#if status === 'ready' && data && data.events.length === 0}
			<p class="notice">{T.empty}</p>
		{/if}
	{/if}
</main>

<SignupDialog
	event={selected}
	names={selected ? (data?.signups.get(selected.id) ?? []) : []}
	dateLabel={selectedDay ? T.dateLabel(selectedDay.weekday, selectedDay.day) : ''}
	{readOnlyReason}
	onsubmit={signup}
	onclose={() => (selectedId = null)}
/>

<style>
	main {
		padding-bottom: 2rem;
	}

	.notice {
		max-width: 40rem;
		margin: 1rem auto 0;
		padding: 0.75rem 1rem;
		background: var(--lime);
		border-left: 6px solid var(--orange);
		color: var(--ink);
		font-weight: 600;
	}

	.notice p {
		margin: 0 0 0.4rem;
	}

	.notice ul {
		margin: 0;
		padding-left: 1.2rem;
		font-weight: 400;
	}

	.notice button {
		min-height: 44px;
		padding: 0 1rem;
		border: 0;
		border-radius: 4px;
		background: var(--rust);
		color: var(--lime);
		font: 700 1rem/1 var(--font-text);
		cursor: pointer;
	}

	@media (max-width: 40rem) {
		.notice {
			margin-inline: 1rem;
		}
	}
</style>
