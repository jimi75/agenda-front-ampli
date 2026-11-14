<script>
	import EventCard from './EventCard.svelte';
	import { participationState } from '#lib/state.js';
	import { T } from '#lib/texts.js';

	/**
	 * @type {{
	 *   month: ReturnType<typeof import('#lib/month.js').buildMonth>,
	 *   byDate: Map<string, import('#lib/events.js').AgendaEvent[]>,
	 *   signups: Map<string, string[]>,
	 *   mine: import('#lib/my-signups.js').MySignup[],
	 *   features: string[],
	 *   today: string,
	 *   signupsOpen: boolean,
	 *   ondetail: (id: string) => void,
	 *   onparticipate: (id: string) => void,
	 *   onunsign: (eventId: string, requestId: string) => Promise<import('#lib/api.js').UnsignResult>
	 * }}
	 */
	let { month, byDate, signups, mine, features, today, signupsOpen, ondetail, onparticipate, onunsign } =
		$props();
</script>

<div class="calendar">
	<ol class="days">
		{#each month.days as d (d.date)}
			{@const events = byDate.get(d.date) ?? []}
			{@const past = today !== '' && d.date < today}
			<li
				id="dia-{d.date}"
				class="day"
				class:empty={events.length === 0}
				class:today={d.date === today}
				class:past
			>
				<h2 class="day-head">
					<time datetime={d.date}>
						<span class="wd">{T.weekdays[d.weekday]}</span>
						<span class="num">{d.day}</span>
						<span class="of">{T.ofMonth}</span>
					</time>
					{#if d.date === today}<span class="today-badge">{T.today}</span>{/if}
				</h2>
				{#each events as event (event.id)}
					<EventCard
						{event}
						count={signups.get(event.id)?.length ?? 0}
						dateLabel={T.dateLabel(d.weekday, d.day)}
						state={participationState(event, { today, signupsOpen })}
						mine={mine.filter((item) => item.eventId === event.id)}
						canUnsign={features.includes('unsignup')}
						{ondetail}
						{onparticipate}
						{onunsign}
					/>
				{/each}
			</li>
		{/each}
	</ol>
</div>

<style>
	.calendar {
		width: 100%;
		max-width: 45rem;
		margin: 0 auto;
		padding: 1rem;
	}

	.days {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.day {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		scroll-margin-top: 0.75rem;
	}

	.day.empty {
		display: none;
	}

	.day-head {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0;
		font-family: var(--font-display);
		font-weight: 400;
		font-size: 1.6rem;
		line-height: 1.1;
		text-transform: uppercase;
		color: var(--rust);
	}

	.today-badge {
		padding: 0.1rem 0.5rem;
		background: var(--rust);
		color: var(--lime);
		font: 700 0.75rem/1.3 var(--font-text);
		letter-spacing: 0.06em;
		border-radius: 2px;
	}

	.today .day-head {
		color: var(--ink);
	}
</style>
