<script lang="ts">
	import { goto } from '$app/navigation';
	import { documentStore as store } from '$lib/stores/document.svelte';
	import { templateStore as tpl } from '$lib/stores/template.svelte';
	import { checkStore as checks } from '$lib/stores/check.svelte';
	import type { CheckFinding, CheckSeverity } from '$lib/check/profileCheck';

	let severityFilter = $state<'all' | CheckSeverity>('all');

	const findings = $derived(
		(checks.report?.findings ?? []).filter(
			(f) => severityFilter === 'all' || f.severity === severityFilter
		)
	);

	function run(all = true) {
		if (!tpl.template) {
			store.errorMessage = 'Load a template before running checks';
			return;
		}
		const keyid = all ? null : store.selectedKeyid;
		const report = checks.run(store.doc, keyid);
		if (report) {
			store.statusMessage = `Checks: ${report.errorCount} error(s), ${report.warningCount} warning(s)`;
			store.errorMessage = null;
		}
	}

	function openFinding(f: CheckFinding) {
		if (!f.keyid) return;
		store.selectKeyid(f.keyid);
		void goto('/');
	}
</script>

<main class="page">
	<header>
		<div>
			<h1>Profile checks</h1>
			<p>
				Validate the in-memory kid_profiles document against the active template. Complements
				upstream <code>eab_chk.py</code> (which loads/dumps via acme_srv.cfg).
			</p>
		</div>
		<div class="actions">
			<button type="button" class="primary" data-testid="run-checks" onclick={() => run(true)}>
				Check all
			</button>
			<button
				type="button"
				disabled={!store.selectedKeyid}
				onclick={() => run(false)}
				title={store.selectedKeyid ? `Check ${store.selectedKeyid}` : 'Select a keyid first'}
			>
				Check selected
			</button>
		</div>
	</header>

	{#if !tpl.template}
		<p class="banner warn">No template loaded yet — open Templates or wait for init.</p>
	{/if}

	{#if checks.report}
		<section class="summary">
			<span>Checked {checks.report.entryCount} entr{checks.report.entryCount === 1 ? 'y' : 'ies'}</span>
			<span class="err">{checks.report.errorCount} errors</span>
			<span class="warn">{checks.report.warningCount} warnings</span>
			<span class="info">{checks.report.infoCount} info</span>
			<span class="muted">{new Date(checks.report.checkedAt).toLocaleString()}</span>
		</section>

		<div class="filters">
			<label>
				Show
				<select bind:value={severityFilter}>
					<option value="all">All</option>
					<option value="error">Errors</option>
					<option value="warning">Warnings</option>
					<option value="info">Info</option>
				</select>
			</label>
		</div>

		<ul class="findings">
			{#each findings as f, i (i)}
				<li class={f.severity}>
					<button type="button" class="row" onclick={() => openFinding(f)} disabled={!f.keyid}>
						<span class="sev">{f.severity}</span>
						<span class="code">{f.code}</span>
						<span class="msg">{f.message}</span>
						{#if f.keyid}
							<span class="meta">{f.keyid}{#if f.section}.{f.section}{/if}{#if f.field}.{f.field}{/if}</span>
						{/if}
					</button>
				</li>
			{:else}
				<li class="empty">No findings for this filter.</li>
			{/each}
		</ul>
	{:else}
		<p class="muted start">Run <strong>Check all</strong> to validate the current document.</p>
	{/if}
</main>

<style>
	.page {
		flex: 1;
		overflow: auto;
		padding: 1.25rem 1.5rem 2rem;
	}
	header {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}
	h1 {
		margin: 0 0 0.35rem;
		font-size: 1.35rem;
	}
	header p {
		margin: 0;
		max-width: 40rem;
		color: var(--muted);
		font-size: 0.88rem;
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
		padding: 0.45rem 0.8rem;
		font: inherit;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	button.primary {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
	}
	.banner.warn {
		background: #fff7e6;
		color: #8a5a00;
		padding: 0.5rem 0.75rem;
		border-radius: 0.3rem;
	}
	.summary {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		padding: 0.65rem 0.85rem;
		border: 1px solid var(--line);
		border-radius: 0.35rem;
		background: var(--surface);
		font-size: 0.85rem;
		margin-bottom: 0.75rem;
	}
	.err {
		color: #9b1c1c;
		font-weight: 600;
	}
	.warn {
		color: #8a5a00;
		font-weight: 600;
	}
	.info {
		color: var(--accent);
		font-weight: 600;
	}
	.muted {
		color: var(--muted);
	}
	.filters {
		margin-bottom: 0.65rem;
	}
	select {
		margin-left: 0.35rem;
		border: 1px solid var(--line);
		border-radius: 0.3rem;
		padding: 0.3rem 0.45rem;
		font: inherit;
		background: #fff;
	}
	.findings {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.35rem;
	}
	.findings li {
		border: 1px solid var(--line);
		border-radius: 0.3rem;
		background: #fff;
		border-left-width: 3px;
	}
	.findings li.error {
		border-left-color: #9b1c1c;
	}
	.findings li.warning {
		border-left-color: #c9850a;
	}
	.findings li.info {
		border-left-color: var(--accent);
	}
	.row {
		width: 100%;
		display: grid;
		grid-template-columns: 5.5rem 9rem 1fr auto;
		gap: 0.65rem;
		align-items: start;
		text-align: left;
		border: 0;
		background: transparent;
		padding: 0.55rem 0.7rem;
		font: inherit;
		cursor: pointer;
	}
	.row:disabled {
		cursor: default;
	}
	.sev {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.error .sev {
		color: #9b1c1c;
	}
	.warning .sev {
		color: #8a5a00;
	}
	.info .sev {
		color: var(--accent);
	}
	.code {
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.75rem;
		color: var(--muted);
	}
	.msg {
		font-size: 0.88rem;
	}
	.meta {
		font-size: 0.75rem;
		color: var(--muted);
		white-space: nowrap;
	}
	.empty,
	.start {
		color: var(--muted);
		font-size: 0.9rem;
	}
	@media (max-width: 800px) {
		.row {
			grid-template-columns: 1fr;
			gap: 0.2rem;
		}
	}
</style>
