<script>
	import { resolve } from '$app/paths';
	import { T } from '#lib/texts.js';
</script>

<svelte:head>
	<title>{T.cookiesPage.title}</title>
</svelte:head>

<main>
	<h1>{T.cookiesPage.heading}</h1>
	{#each T.cookiesPage.sections as section, index}
		<section>
			<h2>{section.heading}</h2>
			{#each section.paragraphs as paragraph}
				<p>
					{#each paragraph.split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`)/) as part}
						{@const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)}
						{#if link}
							<a href={link[2]}>{link[1]}</a>
						{:else if part.startsWith('`')}
							<code>{part.slice(1, -1)}</code>
						{:else}
							{part}
						{/if}
					{/each}
				</p>
			{/each}
			{#if index === 1}
				<div class="table-scroll">
					<table>
						<caption>{T.cookiesPage.table.caption}</caption>
						<thead><tr>{#each T.cookiesPage.table.headers as header}<th scope="col">{header}</th>{/each}</tr></thead>
						<tbody>
							{#each T.cookiesPage.table.rows as row}
								<tr>{#each row as cell, column}<td>{#if column === 0}<code>{cell}</code>{:else}{cell}{/if}</td>{/each}</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	{/each}
	<p>{T.cookiesPage.updated}</p>
	<a href={resolve('/[[districte]]', { districte: '' })} data-sveltekit-reload>{T.cookiesPage.back}</a>
</main>

<style>
	main {
		max-width: 55rem;
		margin: 0 auto;
		padding: 1.5rem 1rem;
	}

	h1, h2 {
		font-family: var(--font-display);
	}

	a {
		color: inherit;
	}

	.table-scroll {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
	}

	caption {
		text-align: left;
		margin-bottom: 0.5rem;
	}

	th, td {
		padding: 0.6rem;
		border: 1px solid var(--ink);
		vertical-align: top;
	}
</style>
