<script>
	import { POSTER } from '#lib/config.js';
	import { formatRange } from '#lib/events.js';
	import { T } from '#lib/texts.js';

	/**
	 * @type {{
	 *   event: import('#lib/events.js').AgendaEvent,
	 *   dateLabel: string,
	 *   node?: HTMLElement
	 * }}
	 */
	let { event, dateLabel, node = $bindable() } = $props();
</script>

<!-- Only mounted while the image is generated. Off screen but painted (not display: none). -->
<div
	bind:this={node}
	class="poster {event.type}"
	style:width="{POSTER.width}px"
	style:height="{POSTER.height}px"
	aria-hidden="true"
>
	<div class="band">{T.siteTitle}</div>
	<div class="body">
		<p class="type">{T.types[event.type].toLocaleUpperCase('ca')}</p>
		<p class="name">{event.name.toLocaleUpperCase('ca')}</p>
		<p class="day">{dateLabel}</p>
		<p class="time">{formatRange(event.start, event.end)}</p>
		{#if event.place}<p class="place">{event.place}</p>{/if}
	</div>
</div>

<style>
	.poster {
		position: fixed;
		top: 0;
		left: -10000px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		font-family: 'Special Gothic Condensed One', sans-serif;
		font-weight: 400;
		font-synthesis: none;
		line-height: 1.05;
	}

	.band {
		flex: none;
		padding: 40px 96px;
		background: var(--orange);
		color: var(--lime-light);
		font-size: 96px;
		line-height: 1.1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.body {
		flex: 1;
		min-height: 0;
		padding: 72px 96px;
		overflow: hidden;
	}

	.accio .body {
		background: var(--lime);
		color: var(--rust);
	}

	.acte .body {
		background: var(--rust);
		color: var(--lime);
	}

	p {
		margin: 0;
		overflow-wrap: anywhere;
	}

	.type {
		font-size: 56px;
		letter-spacing: 0.08em;
	}

	.name {
		margin-top: 24px;
		font-size: 128px;
		line-height: 1.02;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 4;
		line-clamp: 4;
		overflow: hidden;
	}

	.day,
	.time {
		font-size: 76px;
	}

	.day {
		margin-top: 40px;
	}

	.place {
		margin-top: 32px;
		font-size: 64px;
		line-height: 1.1;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
	}
</style>
