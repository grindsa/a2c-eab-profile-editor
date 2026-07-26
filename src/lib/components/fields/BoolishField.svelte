<script lang="ts">
	import { encodeBoolish, parseBoolish } from '$lib/entry/sectionData';

	interface Props {
		label: string;
		value: unknown;
		help?: string;
		onchange: (value: boolean | string | undefined) => void;
	}
	let { label, value, help, onchange }: Props = $props();

	const choice = $derived(parseBoolish(value));
</script>

<div class="field">
	<label>
		<span class="name">{label}</span>
		<select
			value={choice}
			onchange={(e) => {
				const v = (e.currentTarget as HTMLSelectElement).value as ReturnType<typeof parseBoolish>;
				onchange(encodeBoolish(v));
			}}
		>
			<option value="">(unset)</option>
			<option value="bool-true">true (boolean)</option>
			<option value="bool-false">false (boolean)</option>
			<option value="True">"True" (string)</option>
			<option value="False">"False" (string)</option>
			<option value="true">"true" (string)</option>
			<option value="false">"false" (string)</option>
		</select>
	</label>
	{#if help}
		<p class="help">{help}</p>
	{/if}
</div>

<style>
	.field {
		margin-bottom: 0.9rem;
	}
	label {
		display: grid;
		grid-template-columns: minmax(8rem, 12rem) 1fr;
		gap: 0.65rem;
		align-items: center;
	}
	.name {
		font-size: 0.85rem;
		font-weight: 600;
	}
	select {
		width: 100%;
		border: 1px solid var(--line);
		border-radius: 0.3rem;
		padding: 0.4rem 0.55rem;
		font: inherit;
		background: #fff;
	}
	.help {
		margin: 0.3rem 0 0;
		padding-left: calc(12rem + 0.65rem);
		font-size: 0.78rem;
		color: var(--muted);
	}
	@media (max-width: 720px) {
		label {
			grid-template-columns: 1fr;
		}
		.help {
			padding-left: 0;
		}
	}
</style>
