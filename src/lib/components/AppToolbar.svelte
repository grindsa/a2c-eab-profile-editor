<script lang="ts">
	import { page } from '$app/state';
	import { documentStore as store } from '$lib/stores/document.svelte';
	import { isTauriRuntime } from '$lib/io/fs';

	const tauri = isTauriRuntime();
	const views = [
		{ href: '/', label: 'Profiles' },
		{ href: '/checks', label: 'Checks' },
		{ href: '/raw', label: 'Raw YAML' },
		{ href: '/templates', label: 'Templates' }
	] as const;

	let menuOpen = $state(false);
	let menuWrap: HTMLDivElement | undefined;

	async function onNew() {
		if (store.dirty && !confirm('Discard unsaved changes?')) return;
		store.newDocument();
	}

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		if (href === '/') return path === '/';
		return path === href || path.startsWith(`${href}/`);
	}

	function closeMenu() {
		menuOpen = false;
	}

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function onWindowClick(event: MouseEvent) {
		if (!menuOpen || !menuWrap) return;
		if (!menuWrap.contains(event.target as Node)) closeMenu();
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') closeMenu();
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<header class="toolbar">
	<div class="brand-block">
		<img class="logo" src="/logo.png" alt="acme2certifier" />
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

	<div class="menu-wrap" bind:this={menuWrap}>
		<span class="env" class:tauri>{tauri ? 'Tauri' : 'browser'}</span>
		<button
			type="button"
			class="burger"
			data-testid="view-menu"
			aria-label="Views"
			aria-expanded={menuOpen}
			aria-controls="view-menu"
			onclick={toggleMenu}
		>
			<span class="burger-bars" class:open={menuOpen} aria-hidden="true">
				<span></span>
				<span></span>
				<span></span>
			</span>
		</button>
		{#if menuOpen}
			<nav id="view-menu" class="menu" aria-label="Views">
				{#each views as view}
					<a
						href={view.href}
						class:active={isActive(view.href)}
						aria-current={isActive(view.href) ? 'page' : undefined}
						onclick={closeMenu}
					>
						{view.label}
					</a>
				{/each}
			</nav>
		{/if}
	</div>
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
		display: block;
		height: 2.75rem;
		width: auto;
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
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}
	.menu-wrap {
		position: relative;
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.burger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.15rem;
		height: 2.15rem;
		padding: 0;
	}
	.burger-bars {
		position: relative;
		display: block;
		width: 1.05rem;
		height: 0.75rem;
	}
	.burger-bars span {
		position: absolute;
		left: 0;
		right: 0;
		height: 2px;
		border-radius: 1px;
		background: currentColor;
		transition:
			transform 0.15s ease,
			opacity 0.15s ease,
			top 0.15s ease;
	}
	.burger-bars span:nth-child(1) {
		top: 0;
	}
	.burger-bars span:nth-child(2) {
		top: 5px;
	}
	.burger-bars span:nth-child(3) {
		top: 10px;
	}
	.burger-bars.open span:nth-child(1) {
		top: 5px;
		transform: rotate(45deg);
	}
	.burger-bars.open span:nth-child(2) {
		opacity: 0;
	}
	.burger-bars.open span:nth-child(3) {
		top: 5px;
		transform: rotate(-45deg);
	}
	.menu {
		position: absolute;
		top: calc(100% + 0.35rem);
		right: 0;
		z-index: 20;
		min-width: 11rem;
		padding: 0.3rem;
		display: flex;
		flex-direction: column;
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 0.4rem;
		box-shadow: 0 0.5rem 1.25rem color-mix(in srgb, var(--ink) 12%, transparent);
	}
	.menu a {
		display: block;
		padding: 0.45rem 0.7rem;
		border-radius: 0.3rem;
		color: var(--ink);
		text-decoration: none;
		font-size: 0.85rem;
	}
	.menu a:hover {
		background: color-mix(in srgb, var(--accent) 10%, white);
		color: var(--accent);
	}
	.menu a.active {
		background: color-mix(in srgb, var(--accent) 14%, white);
		color: var(--accent);
		font-weight: 600;
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
		color: var(--on-accent);
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
