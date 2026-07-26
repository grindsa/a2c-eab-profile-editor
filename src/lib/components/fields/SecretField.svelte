<script lang="ts">
	import { generateHmacSecret } from '$lib/hmac';

	interface Props {
		label: string;
		value: string;
		help?: string;
		required?: boolean;
		showGenerate?: boolean;
		onchange: (value: string) => void;
	}
	let { label, value, help, required, showGenerate = false, onchange }: Props = $props();
	let visible = $state(false);

	function generate() {
		onchange(generateHmacSecret(32));
	}
</script>

<div class="field">
	<label>
		<span class="name">{label}{#if required} *{/if}</span>
		<div class="ctrl">
			<input
				type={visible ? 'text' : 'password'}
				{value}
				autocomplete="off"
				spellcheck="false"
				oninput={(e) => onchange((e.currentTarget as HTMLInputElement).value)}
			/>
			<button type="button" class="icon" onclick={() => (visible = !visible)} title={visible ? 'Hide' : 'Show'}>
				{visible ? 'Hide' : 'Show'}
			</button>
			{#if showGenerate}
				<button type="button" class="gen" onclick={generate}>Generate</button>
			{/if}
		</div>
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
	.ctrl {
		display: grid;
		grid-template-columns: 1fr auto auto;
		gap: 0.35rem;
	}
	input {
		width: 100%;
		border: 1px solid var(--line);
		border-radius: 0.3rem;
		padding: 0.4rem 0.55rem;
		font: inherit;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.82rem;
		background: #fff;
	}
	button {
		appearance: none;
		border: 1px solid var(--line);
		background: #fff;
		border-radius: 0.3rem;
		padding: 0.35rem 0.55rem;
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
		color: var(--ink);
	}
	.gen {
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 40%, var(--line));
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
