<script lang="ts">
	import { asStringList, coerceStringOrList, RDN_ATTRIBUTES } from '$lib/entry/sectionData';

	interface Props {
		label: string;
		value: unknown;
		help?: string;
		onchange: (value: Record<string, string | string[]> | undefined) => void;
	}
	let { label, value, help, onchange }: Props = $props();

	interface Row {
		attr: string;
		mode: 'string' | 'list';
		parts: string[];
	}

	function rowsFrom(value: unknown): Row[] {
		if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
		return Object.entries(value as Record<string, unknown>).map(([attr, v]) => ({
			attr,
			mode: Array.isArray(v) ? 'list' : 'string',
			parts: asStringList(v).length ? asStringList(v) : ['']
		}));
	}

	const rows = $derived(rowsFrom(value));

	function emit(next: Row[]) {
		const out: Record<string, string | string[]> = {};
		for (const row of next) {
			const attr = row.attr.trim();
			if (!attr) continue;
			const coerced = coerceStringOrList(row.mode, row.parts);
			if (coerced !== undefined) out[attr] = coerced;
		}
		onchange(Object.keys(out).length ? out : undefined);
	}

	function updateRow(index: number, patch: Partial<Row>) {
		const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
		emit(next);
	}

	function removeRow(index: number) {
		emit(rows.filter((_, i) => i !== index));
	}

	function addRow() {
		emit([...rows, { attr: 'commonName', mode: 'string', parts: [''] }]);
	}

	function updatePart(index: number, partIndex: number, text: string) {
		const row = rows[index]!;
		const parts = [...row.parts];
		parts[partIndex] = text;
		updateRow(index, { parts });
	}

	function addPart(index: number) {
		const row = rows[index]!;
		updateRow(index, { parts: [...row.parts, ''] });
	}

	function removePart(index: number, partIndex: number) {
		const row = rows[index]!;
		updateRow(index, { parts: row.parts.filter((_, i) => i !== partIndex) });
	}
</script>

<div class="field">
	<div class="intro">
		<strong>{label || 'Subject DN whitelist'}</strong>
		{#if help}
			<p>{help}</p>
		{:else}
			<p>
				Whitelist of RFC3039 RDNs allowed in the CSR subject. Use <code>*</code> to allow any value.
			</p>
		{/if}
	</div>

	<div class="table">
		<div class="thead">
			<span>Attribute (RDN)</span>
			<span>Value</span>
			<span></span>
		</div>
		{#each rows as row, i (i)}
			<div class="trow">
				<select
					value={row.attr}
					onchange={(e) => updateRow(i, { attr: (e.currentTarget as HTMLSelectElement).value })}
				>
					{#each RDN_ATTRIBUTES as attr}
						<option value={attr}>{attr}</option>
					{/each}
					{#if !RDN_ATTRIBUTES.includes(row.attr as (typeof RDN_ATTRIBUTES)[number])}
						<option value={row.attr}>{row.attr}</option>
					{/if}
				</select>

				<div class="val">
					<div class="mode">
						<button
							type="button"
							class:active={row.mode === 'string'}
							onclick={() => updateRow(i, { mode: 'string' })}>String</button
						>
						<button
							type="button"
							class:active={row.mode === 'list'}
							onclick={() => updateRow(i, { mode: 'list' })}>List</button
						>
					</div>
					{#if row.mode === 'string'}
						<input
							type="text"
							value={row.parts[0] ?? ''}
							placeholder="value or *"
							oninput={(e) => updatePart(i, 0, (e.currentTarget as HTMLInputElement).value)}
						/>
					{:else}
						<div class="chips">
							{#each row.parts as part, j (j)}
								<div class="chip-row">
									<input
										type="text"
										value={part}
										oninput={(e) =>
											updatePart(i, j, (e.currentTarget as HTMLInputElement).value)}
									/>
									<button type="button" class="rm" onclick={() => removePart(i, j)}>×</button>
								</div>
							{/each}
							<button type="button" class="add-sm" onclick={() => addPart(i)}>+ value</button>
						</div>
					{/if}
				</div>

				<button type="button" class="rm" title="Remove RDN" onclick={() => removeRow(i)}>×</button>
			</div>
		{/each}
	</div>

	<button type="button" class="add" onclick={addRow}>+ Add RDN</button>
</div>

<style>
	.field {
		margin-bottom: 1rem;
	}
	.intro strong {
		display: block;
		font-size: 0.95rem;
		margin-bottom: 0.25rem;
	}
	.intro p {
		margin: 0 0 0.75rem;
		font-size: 0.8rem;
		color: var(--muted);
	}
	.table {
		display: grid;
		gap: 0.45rem;
		margin-bottom: 0.5rem;
	}
	.thead,
	.trow {
		display: grid;
		grid-template-columns: minmax(9rem, 12rem) 1fr auto;
		gap: 0.45rem;
		align-items: start;
	}
	.thead {
		font-size: 0.72rem;
		font-weight: 650;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted);
	}
	select,
	input {
		width: 100%;
		border: 1px solid var(--line);
		border-radius: 0.3rem;
		padding: 0.4rem 0.5rem;
		font: inherit;
		background: #fff;
	}
	.val {
		display: grid;
		gap: 0.35rem;
	}
	.mode {
		display: inline-flex;
		border: 1px solid var(--line);
		border-radius: 0.3rem;
		overflow: hidden;
		justify-self: start;
	}
	.mode button {
		appearance: none;
		border: 0;
		background: #fff;
		padding: 0.2rem 0.45rem;
		font: inherit;
		font-size: 0.72rem;
		cursor: pointer;
		color: var(--muted);
	}
	.mode button.active {
		background: color-mix(in srgb, var(--accent) 14%, white);
		color: var(--accent);
		font-weight: 600;
	}
	.chips {
		display: grid;
		gap: 0.3rem;
	}
	.chip-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.3rem;
	}
	button.rm,
	button.add,
	button.add-sm {
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
	.add,
	.add-sm {
		border-style: dashed;
		color: var(--accent);
		padding: 0.35rem 0.65rem;
		font-size: 0.82rem;
	}
	.add-sm {
		justify-self: start;
		font-size: 0.75rem;
	}
	@media (max-width: 720px) {
		.thead,
		.trow {
			grid-template-columns: 1fr;
		}
	}
</style>
