<script lang="ts">
	interface Props {
		entries: { key: string; value: string }[];
		title?: string;
		help?: string;
		onchange: (entries: { key: string; value: string }[]) => void;
	}
	let {
		entries,
		title = 'Extra fields',
		help = 'Custom key/value pairs that are not part of the template but will be preserved.',
		onchange
	}: Props = $props();

	function update(index: number, patch: Partial<{ key: string; value: string }>) {
		onchange(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));
	}

	function remove(index: number) {
		onchange(entries.filter((_, i) => i !== index));
	}

	function add() {
		onchange([...entries, { key: '', value: '' }]);
	}
</script>

<section class="extra">
	<header>
		<strong>{title}</strong>
		<p>{help}</p>
	</header>

	{#each entries as entry, i (i)}
		<div class="row">
			<input
				type="text"
				placeholder="Key"
				value={entry.key}
				oninput={(e) => update(i, { key: (e.currentTarget as HTMLInputElement).value })}
			/>
			<input
				type="text"
				placeholder="Value"
				value={entry.value}
				oninput={(e) => update(i, { value: (e.currentTarget as HTMLInputElement).value })}
			/>
			<button type="button" class="rm" title="Remove" onclick={() => remove(i)}>×</button>
		</div>
	{/each}

	<button type="button" class="add" onclick={add}>+ Add custom field</button>
</section>

<style>
	.extra {
		margin-top: 1.25rem;
		padding-top: 1rem;
		border-top: 1px solid var(--line);
	}
	header strong {
		display: block;
		font-size: 0.95rem;
	}
	header p {
		margin: 0.25rem 0 0.75rem;
		font-size: 0.8rem;
		color: var(--muted);
	}
	.row {
		display: grid;
		grid-template-columns: 1fr 1.4fr auto;
		gap: 0.4rem;
		margin-bottom: 0.4rem;
	}
	input {
		width: 100%;
		border: 1px solid var(--line);
		border-radius: 0.3rem;
		padding: 0.4rem 0.55rem;
		font: inherit;
		background: #fff;
	}
	button {
		appearance: none;
		border: 1px solid var(--line);
		background: #fff;
		border-radius: 0.3rem;
		cursor: pointer;
		font: inherit;
	}
	.rm {
		width: 1.85rem;
		height: 1.85rem;
		color: var(--muted);
	}
	.add {
		border-style: dashed;
		color: var(--accent);
		padding: 0.35rem 0.65rem;
		font-size: 0.82rem;
	}
</style>
