<script lang="ts">
	import { onMount } from 'svelte';
	import AppToolbar from '$lib/components/AppToolbar.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import { templateStore } from '$lib/stores/template.svelte';
	import '../app.css';

	onMount(() => {
		void templateStore.init();
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
