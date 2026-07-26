/**
 * Load + validate kid_profiles UI templates and merge CA overlays.
 */
import { parse } from 'yaml';
import type { ProfileTemplate, TemplateField, TemplateSection } from './types';
import {
	assertSupportedVersion,
	formatZodError,
	overlayTemplateSchema,
	profileTemplateSchema,
	TemplateValidationError,
	type ParsedOverlayTemplate
} from './meta';

export const BUNDLED_TEMPLATE_URL = '/templates/kid_profiles.template.yaml';

export interface BundledOverlayInfo {
	id: string;
	label: string;
	/** Path under /templates/overlays/, or null for no overlay */
	file: string | null;
}

export const BUNDLED_OVERLAYS: BundledOverlayInfo[] = [
	{ id: 'none', label: 'None (base template only)', file: null },
	{ id: 'acme', label: 'CA overlay: ACME', file: 'acme.yaml' },
	{ id: 'certifier', label: 'CA overlay: Certifier', file: 'certifier.yaml' },
	{ id: 'xca', label: 'CA overlay: XCA', file: 'xca.yaml' }
];

export function parseTemplateYaml(text: string): ProfileTemplate {
	let data: unknown;
	try {
		data = parse(text);
	} catch (e) {
		throw new TemplateValidationError(
			`Invalid template YAML: ${e instanceof Error ? e.message : String(e)}`
		);
	}

	const result = profileTemplateSchema.safeParse(data);
	if (!result.success) {
		throw new TemplateValidationError(
			`Template failed meta-schema validation: ${formatZodError(result.error)}`
		);
	}

	assertSupportedVersion(result.data.version);
	return result.data as ProfileTemplate;
}

export function parseOverlayYaml(text: string): ParsedOverlayTemplate {
	let data: unknown;
	try {
		data = parse(text);
	} catch (e) {
		throw new TemplateValidationError(
			`Invalid overlay YAML: ${e instanceof Error ? e.message : String(e)}`
		);
	}

	const result = overlayTemplateSchema.safeParse(data);
	if (!result.success) {
		throw new TemplateValidationError(
			`Overlay failed validation: ${formatZodError(result.error)}`
		);
	}
	if (result.data.version != null) {
		assertSupportedVersion(result.data.version);
	}
	return result.data;
}

/**
 * Merge overlay `fields_add` into base sections by id.
 * Duplicate field names are skipped (base wins). Unknown overlay section ids are ignored.
 */
export function mergeOverlay(
	base: ProfileTemplate,
	overlay: ParsedOverlayTemplate | ProfileTemplate
): ProfileTemplate {
	if (!overlay.sections?.length) {
		return {
			...base,
			description: overlay.description ?? base.description
		};
	}

	const sections: TemplateSection[] = base.sections.map((section) => {
		const over = overlay.sections?.find((s) => s.id === section.id);
		if (!over) return section;

		const names = new Set(section.fields.map((f) => f.name));
		const fields: TemplateField[] = [...section.fields];

		const additions = [...(over.fields_add ?? []), ...(over.fields ?? [])];
		for (const f of additions) {
			if (!names.has(f.name)) {
				fields.push(f as TemplateField);
				names.add(f.name);
			}
		}

		return {
			...section,
			fields,
			additionalProperties: over.additionalProperties ?? section.additionalProperties
		};
	});

	return {
		...base,
		description: overlay.description ?? base.description,
		sections
	};
}

export async function fetchText(url: string): Promise<string> {
	const res = await fetch(url);
	if (!res.ok) {
		throw new TemplateValidationError(`Failed to fetch template (${res.status}): ${url}`);
	}
	return await res.text();
}

export async function loadBundledTemplate(): Promise<ProfileTemplate> {
	const text = await fetchText(BUNDLED_TEMPLATE_URL);
	return parseTemplateYaml(text);
}

export async function loadBundledOverlay(overlayId: string): Promise<ParsedOverlayTemplate | null> {
	const info = BUNDLED_OVERLAYS.find((o) => o.id === overlayId);
	if (!info || !info.file) return null;
	const text = await fetchText(`/templates/overlays/${info.file}`);
	return parseOverlayYaml(text);
}

export async function resolveEffectiveTemplate(
	base: ProfileTemplate,
	overlayId: string
): Promise<ProfileTemplate> {
	const overlay = await loadBundledOverlay(overlayId);
	if (!overlay) return base;
	return mergeOverlay(base, overlay);
}

/** Field names declared by the template for a section (for Extra-fields detection). */
export function knownFieldNames(section: TemplateSection): Set<string> {
	return new Set(section.fields.map((f) => f.name));
}

export function sectionById(
	template: ProfileTemplate,
	id: string
): TemplateSection | undefined {
	return template.sections.find((s) => s.id === id);
}

export { TemplateValidationError };
