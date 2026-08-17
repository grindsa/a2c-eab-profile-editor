<script lang="ts">
	import { documentStore as store } from '$lib/stores/document.svelte';
	import YamlEditor from '$lib/components/YamlEditor.svelte';

	let draft = $state(store.yamlText);
	let editError = $state<string | null>(null);
	let lastApplied = $state(store.yamlText);

	$effect(() => {
		const text = store.yamlText;
		if (text !== lastApplied) {
			draft = text;
			lastApplied = text;
			editError = null;
		}
	});

	function apply() {
		try {
			store.replaceFromYaml(draft);
			store.dirty = true;
			store.statusMessage = 'Applied raw YAML to document';
			store.errorMessage = null;
			lastApplied = draft;
			editError = null;
		} catch (e) {
			editError = e instanceof Error ? e.message : String(e);
		}
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(draft);
			store.statusMessage = 'YAML copied to clipboard';
		} catch {
			store.errorMessage = 'Clipboard copy failed';
		}
	}
</script>

<main class="raw">
	<header>
		<h1>Raw YAML</h1>
		<p>CodeMirror full-document view. Apply writes back into the store (preserves unknown keys).</p>
		<div class="actions">
			<button type="button" class="primary" data-testid="apply-yaml" onclick={apply}>
				Apply to document
			</button>
			<button type="button" onclick={copy}>Copy</button>
			<button type="button" onclick={() => store.save()}>Save file</button>
		</div>
	</header>

	{#if editError}
		<p class="err" role="alert">{editError}</p>
	{/if}

	<YamlEditor value={draft} onchange={(v) => (draft = v)} />
</main>

<style>
	.raw {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		padding: 1rem 1.25rem;
		gap: 0.75rem;
	}
	header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem 1rem;
	}
	h1 {
		margin: 0;
		font-size: 1.25rem;
	}
	p {
		margin: 0;
		color: var(--muted);
		font-size: 0.85rem;
		flex: 1;
	}
	.actions {
		display: flex;
		gap: 0.4rem;
	}
	button {
		appearance: none;
		border: 1px solid var(--line);
		background: #fff;
		border-radius: 0.3rem;
		padding: 0.4rem 0.7rem;
		font: inherit;
		cursor: pointer;
	}
	button.primary {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
	}
	.err {
		margin: 0;
		color: #9b1c1c;
		font-size: 0.85rem;
	}
</style>
