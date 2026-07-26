<script lang="ts">
	import { documentStore as store } from '$lib/stores/document.svelte';
	import { templateStore as tpl } from '$lib/stores/template.svelte';
	import { checkStore as checks } from '$lib/stores/check.svelte';
	import { countUnknownKeys } from '$lib/entry/sectionData';

	const unknown = $derived(
		store.selectedKeyid && store.doc[store.selectedKeyid] && tpl.template
			? countUnknownKeys(store.doc[store.selectedKeyid]!, tpl.template)
			: 0
	);
</script>

<footer class="status">
	<span title={tpl.displaySource}>
		Template: {tpl.template
			? `${tpl.displaySource.split(/[\\/]/).pop()} ${tpl.versionLabel}`
			: 'loading…'}
	</span>
	{#if tpl.settings.overlayId !== 'none'}
		<span>Overlay: {tpl.settings.overlayId}</span>
	{/if}
	{#if unknown > 0}
		<span>preserved {unknown} unknown key{unknown === 1 ? '' : 's'}</span>
	{/if}
	{#if checks.report}
		<span
			class:bad={checks.report.errorCount > 0}
			class:warn={checks.report.errorCount === 0 && checks.report.warningCount > 0}
		>
			Checks: {checks.report.errorCount}E / {checks.report.warningCount}W
		</span>
	{/if}
	<span>{store.entryCount} entr{store.entryCount === 1 ? 'y' : 'ies'}</span>
	<span class="state" class:dirty={store.dirty}>{store.dirty ? 'unsaved' : 'saved'}</span>
</footer>

<style>
	.status {
		display: flex;
		flex-wrap: wrap;
		gap: 1.25rem;
		padding: 0.4rem 1rem;
		border-top: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface) 80%, #dfe8ec);
		font-size: 0.75rem;
		color: var(--muted);
	}
	.bad {
		color: #9b1c1c;
		font-weight: 600;
	}
	.warn {
		color: #8a5a00;
		font-weight: 600;
	}
	.state {
		margin-left: auto;
	}
	.state.dirty {
		color: var(--accent);
		font-weight: 600;
	}
</style>
