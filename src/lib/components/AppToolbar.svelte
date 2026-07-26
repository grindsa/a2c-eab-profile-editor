<script lang="ts">
	import { documentStore as store } from '$lib/stores/document.svelte';
	import { isTauriRuntime } from '$lib/io/fs';

	const tauri = isTauriRuntime();

	async function onNew() {
		if (store.dirty && !confirm('Discard unsaved changes?')) return;
		store.newDocument();
	}
</script>

<header class="toolbar">
	<div class="brand-block">
		<span class="logo">a2c</span>
		<div>
			<strong>EAB Profile Editor</strong>
			<p class="file">{store.displayName}{#if store.dirty} · unsaved{/if}</p>
		</div>
	</div>

	<nav class="actions" aria-label="File">
		<button type="button" onclick={onNew}>New</button>
		<button type="button" onclick={() => store.openFile()}>Open</button>
		<button type="button" class="primary" onclick={() => store.save()}>Save</button>
		<button type="button" onclick={() => store.saveAs()}>Save As</button>
		<button type="button" onclick={() => store.importJson()}>Import JSON</button>
		<button type="button" class="ghost" data-testid="load-example" onclick={() => store.loadBundledExample()}>
			Load example
		</button>
	</nav>

	<nav class="links" aria-label="Views">
		<a href="/">Profiles</a>
		<a href="/checks">Checks</a>
		<a href="/raw">Raw YAML</a>
		<a href="/templates">Templates</a>
		<span class="env" class:tauri>{tauri ? 'Tauri' : 'browser'}</span>
	</nav>
</header>

{#if store.errorMessage}
	<p class="banner error" role="alert">{store.errorMessage}</p>
{/if}
{#if store.statusMessage}
	<p class="banner ok">{store.statusMessage}</p>
{/if}

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.25rem;
		padding: 0.65rem 1rem;
		background: var(--surface);
		border-bottom: 1px solid var(--line);
	}
	.brand-block {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		min-width: 12rem;
	}
	.logo {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: 0.35rem;
		background: var(--accent);
		color: #f4fffd;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.04em;
	}
	.brand-block strong {
		display: block;
		font-size: 0.95rem;
	}
	.file {
		margin: 0.1rem 0 0;
		font-size: 0.75rem;
		color: var(--muted);
	}
	.actions,
	.links {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}
	.links {
		margin-left: auto;
		gap: 0.75rem;
		font-size: 0.85rem;
	}
	button {
		appearance: none;
		border: 1px solid var(--line);
		background: #fff;
		color: var(--ink);
		border-radius: 0.3rem;
		padding: 0.35rem 0.65rem;
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
	}
	button:hover {
		border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
	}
	button.primary {
		background: var(--accent);
		border-color: var(--accent);
		color: #f4fffd;
	}
	button.ghost {
		background: transparent;
	}
	.env {
		padding: 0.15rem 0.45rem;
		border-radius: 0.25rem;
		background: #e4eaed;
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 600;
	}
	.env.tauri {
		background: color-mix(in srgb, var(--accent) 16%, white);
		color: var(--accent);
	}
	.banner {
		margin: 0;
		padding: 0.45rem 1rem;
		font-size: 0.85rem;
		border-bottom: 1px solid var(--line);
	}
	.banner.ok {
		background: color-mix(in srgb, var(--accent) 10%, white);
		color: var(--accent);
	}
	.banner.error {
		background: #fde8e8;
		color: #9b1c1c;
	}
</style>
