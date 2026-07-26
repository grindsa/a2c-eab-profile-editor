<script lang="ts">
	interface Props {
		label: string;
		value: string;
		help?: string;
		required?: boolean;
		onchange: (value: string) => void;
	}
	let { label, value, help, required, onchange }: Props = $props();
</script>

<div class="field">
	<label>
		<span class="name">{label}{#if required} *{/if}</span>
		<input
			type="text"
			{value}
			oninput={(e) => onchange((e.currentTarget as HTMLInputElement).value)}
		/>
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
	input {
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
