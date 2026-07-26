<script lang="ts">
	import type { TemplateField } from '$lib/schema/types';
	import StringField from './StringField.svelte';
	import SecretField from './SecretField.svelte';
	import BoolishField from './BoolishField.svelte';
	import ListField from './ListField.svelte';
	import StringOrListField from './StringOrListField.svelte';
	import MapField from './MapField.svelte';

	interface Props {
		field: TemplateField;
		value: unknown;
		onchange: (value: unknown) => void;
	}
	let { field, value, onchange }: Props = $props();
</script>

{#if field.type === 'string'}
	<StringField
		label={field.name}
		value={typeof value === 'string' ? value : value == null ? '' : String(value)}
		help={field.help}
		required={field.required}
		onchange={onchange}
	/>
{:else if field.type === 'secret'}
	<SecretField
		label={field.name}
		value={typeof value === 'string' ? value : value == null ? '' : String(value)}
		help={field.help}
		required={field.required}
		showGenerate={field.name === 'hmac' || field.encoding === 'base64url'}
		onchange={onchange}
	/>
{:else if field.type === 'boolish'}
	<BoolishField label={field.name} {value} help={field.help} onchange={onchange} />
{:else if field.type === 'list'}
	<ListField
		label={field.name}
		{value}
		help={field.help}
		addLabel={field.item === 'email'
			? '+ Add email'
			: field.item === 'cidr_or_ip'
				? '+ Add IP/CIDR'
				: field.item === 'hostname_pattern'
					? '+ Add domain'
					: '+ Add'}
		onchange={onchange}
	/>
{:else if field.type === 'string_or_list'}
	<StringOrListField label={field.name} {value} help={field.help} onchange={onchange} />
{:else if field.type === 'map'}
	<MapField label={field.name} {value} help={field.help} onchange={onchange} />
{:else}
	<p class="unknown">Unsupported field type for <code>{field.name}</code></p>
{/if}

<style>
	.unknown {
		color: #9b1c1c;
		font-size: 0.85rem;
	}
</style>
