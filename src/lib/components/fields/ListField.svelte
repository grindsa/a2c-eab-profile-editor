<script lang="ts">
	import { asStringList } from '$lib/entry/sectionData';

	interface Props {
		label: string;
		value: unknown;
		help?: string;
		addLabel?: string;
		onchange: (value: string[] | undefined) => void;
	}
	let { label, value, help, addLabel = '+ Add', onchange }: Props = $props();

	let items = $state<string[]>([]);
	let lastEmitted = $state<string | null>(null);

	$effect(() => {
		const serialized = JSON.stringify(asStringList(value));
		if (serialized !== lastEmitted) {
			items = asStringList(value);
		}
	});

	function emit(next: string[]) {
		items = next;
		const stored = next.map((s) => s.trim()).filter(Boolean);
		lastEmitted = JSON.stringify(stored);
		onchange(stored.length ? stored : undefined);
	}

	function updateAt(index: number, text: string) {
		const next = [...items];
		next[index] = text;
		emit(next);
	}

	function removeAt(index: number) {
		emit(items.filter((_, i) => i !== index));
	}

	function add() {
		emit([...items, '']);
	}

	function move(index: number, dir: -1 | 1) {
		const j = index + dir;
		if (j < 0 || j >= items.length) return;
		const next = [...items];
		[next[index], next[j]] = [next[j]!, next[index]!];
		emit(next);
	}
</script>

<div class="field">
	<div class="head">
		<span class="name">{label}</span>
		<div class="list">
			{#each items as item, i (i)}
				<div class="row">
					<button type="button" class="move" title="Move up" onclick={() => move(i, -1)}>↑</button>
					<button type="button" class="move" title="Move down" onclick={() => move(i, 1)}>↓</button>
					<input
						type="text"
						value={item}
						oninput={(e) => updateAt(i, (e.currentTarget as HTMLInputElement).value)}
					/>
					<button type="button" class="rm" title="Remove" onclick={() => removeAt(i)}>×</button>
				</div>
			{/each}
			<button type="button" class="add" onclick={add}>{addLabel}</button>
		</div>
	</div>
	{#if help}
		<p class="help">{help}</p>
	{/if}
</div>

<style>
	.field {
		margin-bottom: 0.9rem;
	}
	.head {
		display: grid;
		grid-template-columns: minmax(8rem, 12rem) 1fr;
		gap: 0.65rem;
		align-items: start;
	}
	.name {
		font-size: 0.85rem;
		font-weight: 600;
		padding-top: 0.45rem;
	}
	.list {
		display: grid;
		gap: 0.35rem;
	}
	.row {
		display: grid;
		grid-template-columns: auto auto 1fr auto;
		gap: 0.3rem;
		align-items: center;
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
		font: inherit;
		cursor: pointer;
	}
	.move,
	.rm {
		width: 1.85rem;
		height: 1.85rem;
		padding: 0;
		color: var(--muted);
	}
	.add {
		justify-self: start;
		border-style: dashed;
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
		padding: 0.35rem 0.65rem;
		font-size: 0.82rem;
	}
	.help {
		margin: 0.3rem 0 0;
		padding-left: calc(12rem + 0.65rem);
		font-size: 0.78rem;
		color: var(--muted);
	}
	@media (max-width: 720px) {
		.head {
			grid-template-columns: 1fr;
		}
		.help {
			padding-left: 0;
		}
	}
</style>
