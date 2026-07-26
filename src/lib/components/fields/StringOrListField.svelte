<script lang="ts">
	import { asStringList, coerceStringOrList } from '$lib/entry/sectionData';

	interface Props {
		label: string;
		value: unknown;
		help?: string;
		onchange: (value: string | string[] | undefined) => void;
	}
	let { label, value, help, onchange }: Props = $props();

	const isList = $derived(Array.isArray(value));
	const mode = $derived<'string' | 'list'>(isList ? 'list' : 'string');
	const items = $derived(asStringList(value));
	const single = $derived(!isList && value != null && value !== '' ? String(value) : items[0] ?? '');

	function setMode(next: 'string' | 'list') {
		const parts = asStringList(value);
		onchange(coerceStringOrList(next, parts.length ? parts : ['']));
	}

	function setSingle(text: string) {
		onchange(coerceStringOrList('string', [text]));
	}

	function setList(parts: string[]) {
		onchange(coerceStringOrList('list', parts));
	}

	function updateAt(index: number, text: string) {
		const next = [...items];
		next[index] = text;
		setList(next);
	}

	function removeAt(index: number) {
		setList(items.filter((_, i) => i !== index));
	}

	function add() {
		setList([...items, '']);
	}
</script>

<div class="field">
	<div class="head">
		<span class="name">{label}</span>
		<div class="body">
			<div class="mode">
				<button type="button" class:active={mode === 'string'} onclick={() => setMode('string')}>
					String
				</button>
				<button type="button" class:active={mode === 'list'} onclick={() => setMode('list')}>
					List
				</button>
			</div>

			{#if mode === 'string'}
				<input type="text" value={single} oninput={(e) => setSingle((e.currentTarget as HTMLInputElement).value)} />
			{:else}
				<div class="list">
					{#each items as item, i (i)}
						<div class="row">
							<input
								type="text"
								value={item}
								oninput={(e) => updateAt(i, (e.currentTarget as HTMLInputElement).value)}
							/>
							<button type="button" class="rm" onclick={() => removeAt(i)}>×</button>
						</div>
					{/each}
					<button type="button" class="add" onclick={add}>+ Add</button>
				</div>
			{/if}
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
	.body {
		display: grid;
		gap: 0.4rem;
	}
	.mode {
		display: inline-flex;
		border: 1px solid var(--line);
		border-radius: 0.3rem;
		overflow: hidden;
	}
	.mode button {
		appearance: none;
		border: 0;
		background: #fff;
		padding: 0.25rem 0.55rem;
		font: inherit;
		font-size: 0.75rem;
		cursor: pointer;
		color: var(--muted);
	}
	.mode button.active {
		background: color-mix(in srgb, var(--accent) 14%, white);
		color: var(--accent);
		font-weight: 600;
	}
	input {
		width: 100%;
		border: 1px solid var(--line);
		border-radius: 0.3rem;
		padding: 0.4rem 0.55rem;
		font: inherit;
		background: #fff;
	}
	.list {
		display: grid;
		gap: 0.35rem;
	}
	.row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.3rem;
	}
	button.rm,
	button.add {
		appearance: none;
		border: 1px solid var(--line);
		background: #fff;
		border-radius: 0.3rem;
		cursor: pointer;
		font: inherit;
	}
	.rm {
		width: 1.85rem;
		color: var(--muted);
	}
	.add {
		justify-self: start;
		border-style: dashed;
		color: var(--accent);
		padding: 0.3rem 0.6rem;
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
