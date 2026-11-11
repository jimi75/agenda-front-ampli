<script>
	import EventCard from './EventCard.svelte';
	import { participationState } from '#lib/state.js';
	import { T } from '#lib/texts.js';

	/**
	 * @type {{
	 *   month: ReturnType<typeof import('#lib/month.js').buildMonth>,
	 *   byDate: Map<string, import('#lib/events.js').AgendaEvent[]>,
	 *   signups: Map<string, string[]>,
	 *   today: string,
	 *   signupsOpen: boolean,
	 *   ondetail: (id: string) => void,
	 *   onparticipate: (id: string) => void
	 * }}
	 */
	let { month, byDate, signups, today, signupsOpen, ondetail, onparticipate } = $props();
</script>

<div class="calendar">
	<ul class="weekdays" aria-hidden="true">
		{#each T.weekdays as weekday (weekday)}
			<li>{weekday}</li>
		{/each}
	</ul>
	<ol class="days" style:--first={month.firstWeekday + 1}>
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
						{ondetail}
						{onparticipate}
					/>
				{/each}
			</li>
		{/each}
	</ol>
</div>

<style>
	.calendar {
		width: 100%;
		max-width: 90rem;
		margin: 0 auto;
		padding: 1rem;
	}

	.weekdays {
		display: none;
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

	@media (min-width: 1024px) {
		.weekdays {
			display: grid;
			grid-template-columns: repeat(7, minmax(0, 1fr));
			margin: 0;
			padding: 0;
			list-style: none;
			background: var(--rust);
			color: var(--lime);
			font-family: var(--font-display);
			font-size: 1.15rem;
			text-align: center;
			text-transform: uppercase;
		}

		.weekdays li {
			padding: 0.35rem 0.25rem;
		}

		.days {
			display: grid;
			grid-template-columns: repeat(7, minmax(0, 1fr));
			grid-auto-rows: minmax(11.5rem, auto);
			gap: 0;
			border-left: 1px solid var(--lime-dark);
			border-top: 1px solid var(--lime-dark);
		}

		.day:first-child {
			grid-column-start: var(--first);
		}

		.day,
		.day.empty {
			display: flex;
			gap: 0.4rem;
			padding: 0.4rem;
			background: #fff;
			border-right: 1px solid var(--lime-dark);
			border-bottom: 1px solid var(--lime-dark);
		}

		.day.today {
			outline: 4px solid var(--orange);
			outline-offset: -4px;
		}

		.day-head {
			font-size: 1.5rem;
			justify-content: space-between;
		}

		.wd,
		.of {
			position: absolute;
			width: 1px;
			height: 1px;
			margin: -1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
		}
	}
</style>
