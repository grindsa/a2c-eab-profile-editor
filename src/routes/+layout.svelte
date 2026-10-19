<script lang="ts">
	import { onMount } from 'svelte';
	import AppToolbar from '$lib/components/AppToolbar.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import { isTauriRuntime } from '$lib/io/fs';
	import { templateStore } from '$lib/stores/template.svelte';
	import '../app.css';

	const APP_TITLE = 'a2c EAB Profile Editor';

	async function applyWindowTitle(): Promise<void> {
		if (!isTauriRuntime()) {
			document.title = APP_TITLE;
			return;
		}
		const { getVersion } = await import('@tauri-apps/api/app');
		const { getCurrentWindow } = await import('@tauri-apps/api/window');
		const version = await getVersion();
		const title = `${APP_TITLE} ${version}`;
		document.title = title;
		await getCurrentWindow().setTitle(title);
	}

	onMount(() => {
		void templateStore.init();
		void applyWindowTitle();
	});
</script>

<div class="app">
	<AppToolbar />
	<div class="body">
		<slot />
	</div>
	<StatusBar />
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
	.body {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
</style>
