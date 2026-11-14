<script>
	import { onMount, setContext, tick } from 'svelte';
	import { browserStorage, createApi } from '#lib/api.js';
	import Calendar from '#lib/components/Calendar.svelte';
	import EventDetail from '#lib/components/EventDetail.svelte';
	import Header from '#lib/components/Header.svelte';
	import Legend from '#lib/components/Legend.svelte';
	import SignupDialog from '#lib/components/SignupDialog.svelte';
	import { eventsTabName, missingPrefix, mineKey } from '#lib/districts.js';
	import { groupByDate, normalizeEvents, parseEventParam } from '#lib/events.js';
	import { buildMonth, todayIso } from '#lib/month.js';
	import { readMine } from '#lib/my-signups.js';
	import { detailUrl } from '#lib/share.js';
	import { participationState } from '#lib/state.js';
	import { T } from '#lib/texts.js';

	/** @type {{ data: { district: import('#lib/districts.js').District } }} */
	let { data: page } = $props();
	// A page is prerendered for one district and never navigates to another.
	// svelte-ignore state_referenced_locally
	const district = page.district;
	setContext('district', district);

	const month = buildMonth();
	const API_URL = import.meta.env.VITE_AGENDA_API_URL ?? '';
	const REFRESH_AFTER_MS = 120_000;

	/**
	 * @typedef {{
	 *   events: import('#lib/events.js').AgendaEvent[],
	 *   skipped: import('#lib/events.js').SkippedRow[],
	 *   missingColumns: string[],
	 *   features: string[],
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
	let detailId = $state(null);
	/** @type {string | null} */
	let signupId = $state(null);
	/** This browser's own signups (the secret of an unsignup lives here); re-read after every signup or unsignup. */
	let mine = $state.raw(/** @type {import('#lib/my-signups.js').MySignup[]} */ ([]));
	let today = $state('');
	let showAdmin = $state(false);
	let lastLoad = 0;
	// The detail opened from a `?e=` link has no opener to give the focus back to.
	let openedFromLink = false;

	const missingIds = $derived(missingPrefix(data?.events ?? [], district));
	const byDate = $derived(groupByDate(data?.events ?? []));
	const detailEvent = $derived(data?.events.find((e) => e.id === detailId) ?? null);
	const signupEvent = $derived(data?.events.find((e) => e.id === signupId) ?? null);
	const notFound = $derived(detailId !== null && detailEvent === null);
	const detailState = $derived(
		detailEvent ? participationState(detailEvent, { today, signupsOpen: data?.signupsOpen ?? true }) : null
	);
	const detailLink = $derived(detailEvent ? detailUrl(location, detailEvent.id) : '');
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
			features: agenda.features,
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

	/** The list starts at the next day with events, unless the page was already scrolled. */
	async function anchorToUpcoming() {
		await tick();
		if (window.scrollY > 0) return;
		const withEvents = month.days.filter((d) => byDate.has(d.date));
		const next = withEvents.find((d) => d.date >= today);
		if (!next || next === withEvents[0]) return;
		const el = document.getElementById(`dia-${next.date}`);
		if (!el) return;
		const top = el.getBoundingClientRect().top;
		if (top >= 0 && top < window.innerHeight) return;
		el.scrollIntoView({ block: 'start' });
	}

	/** @param {import('#lib/events.js').AgendaEvent | null} event */
	function dateLabelOf(event) {
		const day = month.days.find((d) => d.date === event?.date);
		return day ? T.dateLabel(day.weekday, day.day) : '';
	}

	/** @param {string} id */
	function openDetail(id) {
		detailId = id;
	}

	function closeDetail() {
		detailId = null;
		if (!openedFromLink) return;
		openedFromLink = false;
		const title = document.querySelector('h1');
		title?.setAttribute('tabindex', '-1');
		title?.focus();
	}

	/** @param {string} id */
	function openSignup(id) {
		signupId = id;
		load({ silent: true });
	}

	/** @param {string} name @returns {Promise<import('#lib/api.js').SignupResult>} */
	async function signup(name) {
		const id = signupId;
		if (!api || !id || !data) return { ok: false, error: 'server' };
		const result = await api.signup(id, name, data.signups.get(id)?.length ?? 0);
		mine = readMine(browserStorage(), mineKey(district));
		if (result.ok) {
			data = { ...data, signups: new Map(data.signups).set(id, result.names) };
		} else if (result.error === 'closed') {
			data = { ...data, signupsOpen: false };
		}
		if (!result.ok && ['event_full', 'unknown_event', 'closed'].includes(result.error)) load({ silent: true });
		return result;
	}

	/** @param {string} eventId @param {string} requestId @returns {Promise<import('#lib/api.js').UnsignResult>} */
	async function unsignup(eventId, requestId) {
		if (!api) return { ok: false, error: 'server' };
		const result = await api.unsignup(eventId, requestId);
		mine = readMine(browserStorage(), mineKey(district));
		if (result.ok && data) {
			data = { ...data, signups: new Map(data.signups).set(eventId, result.names) };
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
		mine = readMine(browserStorage(), mineKey(district));
		if (API_URL) {
			api = createApi({ url: API_URL, district });
		} else if (import.meta.env.DEV) {
			api = (await import('#lib/mock-api.js')).createMockApi({ district });
		}
		if (!api) {
			status = 'error';
			return;
		}
		const linkedId = parseEventParam(location.search);
		const copy = api.loadCopy?.() ?? null;
		// A copy without the linked event cannot answer the link: wait for the live data instead.
		if (copy && (linkedId === null || copy.agenda.events.some((e) => /** @type {any} */ (e)?.id === linkedId))) {
			apply({ ...copy.agenda, staleSince: null });
			load({ silent: true });
		} else {
			await load();
			if (status !== 'ready') return;
		}
		// A shared link is read once, here: a failed first load does not read it again on retry.
		if (linkedId === null) {
			anchorToUpcoming();
		} else {
			openedFromLink = true;
			detailId = linkedId;
		}
	});
</script>

<svelte:head>
	<title>{T.siteTitle(district)}</title>
	<meta name="description" content={T.siteDescription(district)} />
	<meta property="og:title" content={T.siteTitle(district)} />
	<meta property="og:description" content={T.siteDescription(district)} />
</svelte:head>

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

	{#if showAdmin && data}
		<div class="notice">
			<p>features: {data.features.length ? data.features.join(', ') : '—'} · local signups: {mine.length}</p>
			{#if data.missingColumns.length}
				<p><strong>{T.missingColumns(data.missingColumns, eventsTabName(district))}</strong></p>
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
			{#if missingIds.length}
				<p><strong>{T.prefixWarning(missingIds, district)}</strong></p>
			{/if}
		</div>
	{/if}

	{#if status !== 'error' && !unreadable}
		<Calendar
			{month}
			{byDate}
			signups={data?.signups ?? new Map()}
			{mine}
			features={data?.features ?? []}
			{today}
			signupsOpen={data?.signupsOpen ?? true}
			ondetail={openDetail}
			onparticipate={openSignup}
			onunsign={unsignup}
		/>
		{#if status === 'ready' && data && data.events.length === 0}
			<p class="notice">{T.empty}</p>
		{/if}
	{/if}
</main>

<EventDetail
	event={detailEvent}
	names={detailEvent ? (data?.signups.get(detailEvent.id) ?? []) : []}
	state={detailState}
	dateLabel={dateLabelOf(detailEvent)}
	url={detailLink}
	{notFound}
	onclose={closeDetail}
	onparticipate={openSignup}
/>

<SignupDialog
	event={signupEvent}
	dateLabel={dateLabelOf(signupEvent)}
	features={data?.features ?? []}
	mine={signupId ? mine.filter((item) => item.eventId === signupId) : []}
	onsubmit={signup}
	onunsign={unsignup}
	onclose={() => (signupId = null)}
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
