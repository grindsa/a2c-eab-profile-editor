<script lang="ts">
	import type { KidProfileEntry, TemplateSection } from '$lib/schema/types';
	import {
		getSectionBag,
		listExtraKeys,
		setSectionBag,
		setSectionField
	} from '$lib/entry/sectionData';
	import FieldRenderer from './FieldRenderer.svelte';
	import ExtraFields from './ExtraFields.svelte';

	interface Props {
		entry: KidProfileEntry;
		section: TemplateSection;
		onupdate: (entry: KidProfileEntry) => void;
	}
	let { entry, section, onupdate }: Props = $props();

	const bag = $derived(getSectionBag(entry, section));
	const extras = $derived(
		listExtraKeys(bag, section).map((key) => ({
			key,
			value: stringifyExtra(bag[key])
		}))
	);

	function stringifyExtra(v: unknown): string {
		if (v === undefined || v === null) return '';
		if (typeof v === 'string') return v;
		if (typeof v === 'number' || typeof v === 'boolean') return String(v);
		try {
			return JSON.stringify(v);
		} catch {
			return String(v);
		}
	}

	function parseExtra(text: string): unknown {
		const t = text.trim();
		if (t === 'true') return true;
		if (t === 'false') return false;
		if (t === 'True' || t === 'False') return t;
		if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
		if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
			try {
				return JSON.parse(t);
			} catch {
				return text;
			}
		}
		return text;
	}

	function setField(name: string, value: unknown) {
		onupdate(setSectionField(entry, section, name, value));
	}

	function setExtras(rows: { key: string; value: string }[]) {
		const known = new Set(section.fields.map((f) => f.name));
		const next: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(bag)) {
			if (known.has(k)) next[k] = v;
		}
		for (const row of rows) {
			const key = row.key.trim();
			if (!key || known.has(key)) continue;
			next[key] = parseExtra(row.value);
		}
		onupdate(setSectionBag(entry, section, next));
	}
</script>

<div class="section-form">
	{#each section.fields as field (field.name)}
		<FieldRenderer field={field} value={bag[field.name]} onchange={(v) => setField(field.name, v)} />
	{/each}

	{#if section.additionalProperties !== false}
		<ExtraFields entries={extras} onchange={setExtras} />
	{/if}
</div>
