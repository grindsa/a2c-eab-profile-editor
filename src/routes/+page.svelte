<script lang="ts">
	import { documentStore as store } from '$lib/stores/document.svelte';
	import { templateStore as tpl } from '$lib/stores/template.svelte';
	import { serializeKidProfilesYaml } from '$lib/io/document';
	import {
		countUnknownKeys,
		listTopLevelExtraKeys
	} from '$lib/entry/sectionData';
	import type { KidProfileEntry, TemplateSection } from '$lib/schema/types';
	import SectionForm from '$lib/components/fields/SectionForm.svelte';
	import ExtraFields from '$lib/components/fields/ExtraFields.svelte';

	let filter = $state('');
	let newKeyid = $state('');
	let activeSection = $state('hmac');

	const filtered = $derived(
		store.keyids.filter((k) => k.toLowerCase().includes(filter.trim().toLowerCase()))
	);

	const selected = $derived(
		store.selectedKeyid && store.doc[store.selectedKeyid]
			? (store.doc[store.selectedKeyid] as KidProfileEntry)
			: null
	);

	const sections = $derived(tpl.template?.sections ?? []);

	$effect(() => {
		if (
			activeSection !== 'extra' &&
			sections.length &&
			!sections.some((s) => s.id === activeSection)
		) {
			activeSection = sections[0]!.id;
		}
	});

	const previewYaml = $derived(
		store.selectedKeyid && selected
			? serializeKidProfilesYaml({ [store.selectedKeyid]: selected })
			: ''
	);

	const unknownCount = $derived(
		selected && tpl.template ? countUnknownKeys(selected, tpl.template) : 0
	);

	const activeTemplateSection = $derived(
		sections.find((s) => s.id === activeSection) as TemplateSection | undefined
	);

	const topExtras = $derived(
		selected && tpl.template
			? listTopLevelExtraKeys(selected, tpl.template).map((key) => ({
					key,
					value: stringifyExtra(selected[key])
				}))
			: []
	);

	function stringifyExtra(v: unknown): string {
		if (v === undefined || v === null) return '';
		if (typeof v === 'string') return v;
		if (typeof v === 'number' || typeof v === 'boolean') return String(v);
		try {
			return JSON.stringify(v);
		} catch {
			return String(v);
		}
	}

	function parseExtra(text: string): unknown {
		const t = text.trim();
		if (t === 'true') return true;
		if (t === 'false') return false;
		if (t === 'True' || t === 'False') return t;
		if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
		if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
			try {
				return JSON.parse(t);
			} catch {
				return text;
			}
		}
		return text;
	}

	function addKeyid() {
		try {
			store.clearMessages();
			store.addKeyid(newKeyid || `keyid_${String(store.entryCount).padStart(2, '0')}`);
			newKeyid = '';
		} catch (e) {
			store.errorMessage = e instanceof Error ? e.message : String(e);
		}
	}

	function renameSelected() {
		if (!store.selectedKeyid) return;
		const next = prompt('Rename keyid', store.selectedKeyid);
		if (next === null) return;
		try {
			store.clearMessages();
			store.renameKeyid(store.selectedKeyid, next);
		} catch (e) {
			store.errorMessage = e instanceof Error ? e.message : String(e);
		}
	}

	function deleteSelected() {
		if (!store.selectedKeyid) return;
		if (!confirm(`Delete ${store.selectedKeyid}?`)) return;
		store.deleteKeyid(store.selectedKeyid);
	}

	function onEntryUpdate(entry: KidProfileEntry) {
		if (!store.selectedKeyid) return;
		store.updateEntry(store.selectedKeyid, entry);
	}

	function setTopExtras(rows: { key: string; value: string }[]) {
		if (!selected || !tpl.template || !store.selectedKeyid) return;
		const next: KidProfileEntry = { ...selected };
		for (const k of listTopLevelExtraKeys(selected, tpl.template)) {
			delete next[k];
		}
		for (const row of rows) {
			const key = row.key.trim();
			if (!key) continue;
			next[key] = parseExtra(row.value);
		}
		store.updateEntry(store.selectedKeyid, next);
	}

	function duplicateSelected() {
		if (!store.selectedKeyid || !selected) return;
		let base = `${store.selectedKeyid}_copy`;
		let name = base;
		let n = 2;
		while (name in store.doc) {
			name = `${base}_${n++}`;
		}
		store.addKeyid(name, structuredClone(selected));
	}
</script>

<div class="workspace">
	<aside class="sidebar">
		<label class="search">
			<span class="sr">Search keyid</span>
			<input type="search" placeholder="Search keyid…" bind:value={filter} />
		</label>

		<ul class="keyids">
			{#each filtered as keyid (keyid)}
				<li>
					<button
						type="button"
						class:active={store.selectedKeyid === keyid}
						data-testid="keyid-{keyid}"
						onclick={() => store.selectKeyid(keyid)}
					>
						{keyid}
					</button>
				</li>
			{:else}
				<li class="empty">No keyids</li>
			{/each}
		</ul>

		<form
			class="add"
			onsubmit={(e) => {
				e.preventDefault();
				addKeyid();
			}}
		>
			<input type="text" placeholder="new_keyid" bind:value={newKeyid} />
			<button type="submit">+ Add</button>
		</form>
	</aside>

	<section class="detail">
		{#if store.selectedKeyid && selected}
			<header class="detail-head">
				<h1>
					<button type="button" class="rename" onclick={renameSelected} title="Rename">
						{store.selectedKeyid}
					</button>
				</h1>
				<div class="detail-actions">
					<button type="button" onclick={() => store.save()}>Save</button>
					<button type="button" onclick={duplicateSelected}>Duplicate</button>
					<button type="button" class="danger" onclick={deleteSelected}>Delete</button>
				</div>
			</header>

			{#if sections.length}
				<nav class="tabs" aria-label="Sections">
					{#each sections as section (section.id)}
						<button
							type="button"
							class:active={activeSection === section.id}
							onclick={() => (activeSection = section.id)}
						>
							{section.label}
						</button>
					{/each}
					<button
						type="button"
						class:active={activeSection === 'extra'}
						onclick={() => (activeSection = 'extra')}
					>
						Extra
					</button>
				</nav>
			{/if}

			{#if activeSection === 'extra'}
				<ExtraFields
					title="Top-level extra fields"
					help="Keys on this entry that are not hmac and not a known template section. Section-level unknowns appear under each section."
					entries={topExtras}
					onchange={setTopExtras}
				/>
			{:else if activeTemplateSection}
				<SectionForm
					entry={selected}
					section={activeTemplateSection}
					onupdate={onEntryUpdate}
				/>
			{/if}

			{#if unknownCount > 0}
				<p class="unknown-hint">Preserving {unknownCount} unknown key{unknownCount === 1 ? '' : 's'}.</p>
			{/if}

			<details class="preview" open={activeSection === 'authorization' || activeSection === 'extra'}>
				<summary>YAML preview (selected entry)</summary>
				<pre>{previewYaml}</pre>
			</details>
		{:else}
			<div class="empty-detail">
				<h1>No selection</h1>
				<p>Open a YAML file, import a JSON fixture, load the example, or add a keyid.</p>
			</div>
		{/if}
	</section>
</div>

<style>
	.workspace {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: minmax(14rem, 18rem) 1fr;
		background: transparent;
	}
	.sidebar {
		display: flex;
		flex-direction: column;
		border-right: 1px solid var(--line);
		background: var(--surface);
		min-height: 0;
	}
	.search {
		display: block;
		padding: 0.75rem;
		border-bottom: 1px solid var(--line);
	}
	.search input,
	.add input {
		width: 100%;
		border: 1px solid var(--line);
		border-radius: 0.3rem;
		padding: 0.4rem 0.55rem;
		font: inherit;
		background: #fff;
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
	.keyids {
		list-style: none;
		margin: 0;
		padding: 0.35rem 0;
		overflow: auto;
		flex: 1;
	}
	.keyids button {
		width: 100%;
		text-align: left;
		border: 0;
		background: transparent;
		padding: 0.55rem 0.85rem;
		font: inherit;
		cursor: pointer;
		border-left: 3px solid transparent;
	}
	.keyids button:hover {
		background: color-mix(in srgb, var(--accent) 6%, white);
	}
	.keyids button.active {
		background: color-mix(in srgb, var(--accent) 12%, white);
		border-left-color: var(--accent);
		font-weight: 600;
	}
	.empty {
		padding: 1rem;
		color: var(--muted);
		font-size: 0.85rem;
	}
	.add {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.35rem;
		padding: 0.65rem;
		border-top: 1px solid var(--line);
	}
	.add button,
	.detail-actions button,
	.tabs button {
		appearance: none;
		border: 1px solid var(--line);
		background: #fff;
		border-radius: 0.3rem;
		padding: 0.4rem 0.65rem;
		font: inherit;
		cursor: pointer;
	}
	.detail {
		padding: 1.25rem 1.5rem;
		overflow: auto;
		background: color-mix(in srgb, var(--surface) 70%, transparent);
	}
	.detail-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.85rem;
	}
	.detail-head h1 {
		margin: 0;
		font-size: 1.35rem;
	}
	.rename {
		border: 0;
		background: transparent;
		font: inherit;
		font-weight: 650;
		cursor: pointer;
		color: var(--ink);
		padding: 0;
	}
	.rename:hover {
		color: var(--accent);
		text-decoration: underline;
	}
	.detail-actions {
		display: flex;
		gap: 0.4rem;
	}
	.danger {
		color: #9b1c1c !important;
	}
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-bottom: 1rem;
		border-bottom: 1px solid var(--line);
		padding-bottom: 0.35rem;
	}
	.tabs button {
		border: 0;
		background: transparent;
		border-radius: 0;
		border-bottom: 2px solid transparent;
		padding: 0.45rem 0.65rem;
		color: var(--muted);
	}
	.tabs button.active {
		color: var(--accent);
		border-bottom-color: var(--accent);
		font-weight: 600;
	}
	.unknown-hint {
		margin: 0.5rem 0 0;
		font-size: 0.78rem;
		color: var(--accent);
	}
	.preview {
		margin-top: 1rem;
		border: 1px solid var(--line);
		border-radius: 0.35rem;
		background: #fff;
	}
	.preview summary {
		padding: 0.55rem 0.75rem;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.preview pre {
		margin: 0;
		padding: 0.75rem;
		border-top: 1px solid var(--line);
		overflow: auto;
		font-size: 0.78rem;
		line-height: 1.45;
		white-space: pre-wrap;
	}
	.empty-detail {
		max-width: 28rem;
		margin: 3rem auto;
		text-align: center;
		color: var(--muted);
	}
	.empty-detail h1 {
		margin: 0 0 0.5rem;
		color: var(--ink);
		font-size: 1.25rem;
	}

	@media (max-width: 720px) {
		.workspace {
			grid-template-columns: 1fr;
		}
		.sidebar {
			max-height: 40vh;
			border-right: 0;
			border-bottom: 1px solid var(--line);
		}
	}
</style>
