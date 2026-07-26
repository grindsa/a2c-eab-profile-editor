<script lang="ts">
	import { templateStore as tpl } from '$lib/stores/template.svelte';
	import { documentStore } from '$lib/stores/document.svelte';

	async function onApply() {
		await tpl.applyDraft();
		if (!tpl.errorMessage) {
			documentStore.statusMessage = tpl.statusMessage;
		}
	}
</script>

<main class="page">
	<header>
		<h1>Template source</h1>
		<p>Drive forms from a versioned template without rebuilding the app.</p>
	</header>

	{#if tpl.errorMessage}
		<p class="banner error" role="alert">{tpl.errorMessage}</p>
	{/if}
	{#if tpl.statusMessage}
		<p class="banner ok">{tpl.statusMessage}</p>
	{/if}

	<div class="grid">
		<section class="panel">
			<h2>Select template source</h2>

			<label class="radio">
				<input
					type="radio"
					name="source"
					checked={tpl.draft.source === 'bundled'}
					onchange={() => (tpl.draft = { ...tpl.draft, source: 'bundled' })}
				/>
				<span>
					<strong>Bundled default</strong>
					<small>Use the built-in template that ships with the editor.</small>
				</span>
			</label>

			<label class="radio">
				<input
					type="radio"
					name="source"
					checked={tpl.draft.source === 'file'}
					onchange={() => (tpl.draft = { ...tpl.draft, source: 'file' })}
				/>
				<span>
					<strong>Local file path</strong>
					<small>Load a template from your filesystem.</small>
				</span>
			</label>
			{#if tpl.draft.source === 'file'}
				<div class="row">
					<input
						type="text"
						placeholder="templates/kid_profiles.template.yaml"
						value={tpl.draft.filePath}
						oninput={(e) =>
							(tpl.draft = {
								...tpl.draft,
								filePath: (e.currentTarget as HTMLInputElement).value
							})}
					/>
					<button type="button" onclick={() => tpl.browseLocalTemplate()}>Browse…</button>
				</div>
			{/if}

			<label class="radio">
				<input
					type="radio"
					name="source"
					checked={tpl.draft.source === 'url'}
					onchange={() => (tpl.draft = { ...tpl.draft, source: 'url' })}
				/>
				<span>
					<strong>URL</strong>
					<small>Load a template from a remote location.</small>
				</span>
			</label>
			{#if tpl.draft.source === 'url'}
				<input
					type="url"
					placeholder="https://example.com/kid_profiles.template.yaml"
					value={tpl.draft.url}
					oninput={(e) =>
						(tpl.draft = { ...tpl.draft, url: (e.currentTarget as HTMLInputElement).value })}
				/>
			{/if}

			<label class="overlay">
				<span>Overlay</span>
				<select
					value={tpl.draft.overlayId}
					onchange={(e) =>
						(tpl.draft = {
							...tpl.draft,
							overlayId: (e.currentTarget as HTMLSelectElement).value
						})}
				>
					{#each tpl.overlays as o (o.id)}
						<option value={o.id}>{o.label}</option>
					{/each}
				</select>
			</label>

			<div class="meta">
				<h3>Template meta</h3>
				{#if tpl.template}
					<ul>
						<li><span>Version</span> {tpl.template.version}</li>
						<li><span>Format</span> {tpl.template.format}</li>
						<li><span>Supported</span> ≤ v{tpl.supportedVersion}</li>
						<li>
							<span>Last loaded</span>
							{tpl.loadedAt ? new Date(tpl.loadedAt).toISOString() : '—'}
						</li>
					</ul>
				{:else}
					<p class="muted">No template loaded yet.</p>
				{/if}
			</div>
		</section>

		<section class="panel">
			<h2>Template structure</h2>
			{#if tpl.template}
				<ul class="tree">
					{#each tpl.template.sections as section (section.id)}
						<li>
							<strong>{section.id}</strong>
							{#if section.additionalProperties}
								<em>(additionalProperties: true)</em>
							{/if}
							<ul>
								{#each section.fields as field (field.name)}
									<li>
										<code>{field.name}</code>
										<span class="type">{field.type}</span>
									</li>
								{/each}
							</ul>
						</li>
					{/each}
					<li><strong>extra fields</strong> <em>preserved on save</em></li>
				</ul>
			{:else}
				<p class="muted">Apply a template to see its outline.</p>
			{/if}
		</section>
	</div>

	<footer class="bar">
		<button type="button" class="primary" onclick={onApply}>Apply template</button>
		<button type="button" onclick={() => tpl.validateDraft()}>Validate template</button>
		<button type="button" class="ghost" onclick={() => tpl.resetDraft()}>Reset</button>
		<p class="hint">Unknown cahandler keys are preserved on save.</p>
	</footer>
</main>

<style>
	.page {
		flex: 1;
		padding: 1.25rem 1.5rem 1.5rem;
		overflow: auto;
	}
	header h1 {
		margin: 0 0 0.25rem;
		font-size: 1.35rem;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}
	header p {
		margin: 0 0 1rem;
		color: var(--muted);
	}
	.banner {
		margin: 0 0 0.75rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.3rem;
		font-size: 0.85rem;
	}
	.banner.ok {
		background: color-mix(in srgb, var(--accent) 10%, white);
		color: var(--accent);
	}
	.banner.error {
		background: #fde8e8;
		color: #9b1c1c;
	}
	.grid {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
		gap: 1rem;
		align-items: start;
	}
	.panel {
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 0.35rem;
		padding: 1rem 1.1rem 1.15rem;
	}
	.panel h2 {
		margin: 0 0 0.85rem;
		font-size: 0.78rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.radio {
		display: flex;
		gap: 0.65rem;
		align-items: flex-start;
		margin-bottom: 0.75rem;
		cursor: pointer;
	}
	.radio strong {
		display: block;
		font-size: 0.95rem;
	}
	.radio small {
		display: block;
		color: var(--muted);
		font-size: 0.8rem;
		margin-top: 0.15rem;
	}
	.row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.4rem;
		margin: -0.25rem 0 0.85rem 1.6rem;
	}
	input[type='text'],
	input[type='url'],
	select {
		width: 100%;
		border: 1px solid var(--line);
		border-radius: 0.3rem;
		padding: 0.4rem 0.55rem;
		font: inherit;
		background: #fff;
		margin-bottom: 0.85rem;
	}
	.radio + input[type='url'] {
		margin-left: 1.6rem;
		width: calc(100% - 1.6rem);
	}
	.overlay {
		display: block;
		margin-top: 0.5rem;
	}
	.overlay span {
		display: block;
		font-size: 0.78rem;
		font-weight: 650;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--muted);
		margin-bottom: 0.35rem;
	}
	.meta {
		margin-top: 1rem;
		padding-top: 0.85rem;
		border-top: 1px solid var(--line);
	}
	.meta h3 {
		margin: 0 0 0.5rem;
		font-size: 0.78rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.meta ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.35rem;
		font-size: 0.9rem;
	}
	.meta li span {
		display: inline-block;
		min-width: 6.5rem;
		color: var(--muted);
	}
	.muted {
		color: var(--muted);
		font-size: 0.9rem;
	}
	.tree {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.75rem;
	}
	.tree > li > ul {
		list-style: none;
		margin: 0.35rem 0 0;
		padding: 0 0 0 0.75rem;
		border-left: 2px solid var(--line);
		display: grid;
		gap: 0.25rem;
	}
	.tree em {
		margin-left: 0.35rem;
		font-size: 0.75rem;
		color: var(--muted);
		font-style: normal;
	}
	.tree code {
		font-size: 0.82rem;
	}
	.type {
		margin-left: 0.4rem;
		font-size: 0.72rem;
		color: var(--accent);
	}
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding-top: 0.85rem;
		border-top: 1px solid var(--line);
	}
	button {
		appearance: none;
		border: 1px solid var(--line);
		background: #fff;
		border-radius: 0.3rem;
		padding: 0.45rem 0.8rem;
		font: inherit;
		cursor: pointer;
	}
	button.primary {
		background: var(--accent);
		border-color: var(--accent);
		color: #f4fffd;
	}
	button.ghost {
		background: transparent;
	}
	.hint {
		margin: 0 0 0 auto;
		font-size: 0.8rem;
		color: var(--muted);
	}

	@media (max-width: 860px) {
		.grid {
			grid-template-columns: 1fr;
		}
		.hint {
			margin-left: 0;
			width: 100%;
		}
	}
</style>
