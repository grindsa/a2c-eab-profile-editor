import { knownFieldNames } from '../schema/template';
import type { KidProfileEntry, ProfileTemplate, TemplateSection } from '../schema/types';

export function sectionPath(section: TemplateSection): string {
	if (section.path !== undefined) return section.path;
	return section.id === 'hmac' ? '' : section.id;
}

export function getSectionBag(
	entry: KidProfileEntry,
	section: TemplateSection
): Record<string, unknown> {
	const path = sectionPath(section);
	if (!path) {
		// Root section (hmac): only root fields — never pull nested section objects into this bag.
		const known = knownFieldNames(section);
		const bag: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(entry)) {
			if (known.has(k)) {
				bag[k] = v;
				continue;
			}
			// Preserve non-object extras at root; skip nested maps (other sections).
			if (v !== null && typeof v === 'object' && !Array.isArray(v)) continue;
			bag[k] = v;
		}
		return bag;
	}
	const bag = entry[path];
	if (bag && typeof bag === 'object' && !Array.isArray(bag)) {
		return { ...(bag as Record<string, unknown>) };
	}
	return {};
}

function isEmptyValue(value: unknown): boolean {
	if (value === undefined || value === null) return true;
	if (typeof value === 'string' && value === '') return true;
	if (Array.isArray(value) && value.length === 0) return true;
	if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) {
		return true;
	}
	return false;
}

/** Set a field inside a section; empty values remove the key (hmac kept as ''). */
export function setSectionField(
	entry: KidProfileEntry,
	section: TemplateSection,
	name: string,
	value: unknown
): KidProfileEntry {
	const path = sectionPath(section);

	if (!path) {
		const next: KidProfileEntry = { ...entry, [name]: value };
		if (name === 'hmac') {
			next.hmac = typeof value === 'string' ? value : String(value ?? '');
			return next;
		}
		if (isEmptyValue(value)) {
			const { [name]: _, ...rest } = next;
			return rest as KidProfileEntry;
		}
		return next;
	}

	const bag = getSectionBag(entry, section);
	if (isEmptyValue(value)) {
		delete bag[name];
	} else {
		bag[name] = value;
	}

	const next: KidProfileEntry = { ...entry };
	if (Object.keys(bag).length === 0) {
		delete next[path];
	} else {
		next[path] = bag;
	}
	return next;
}

/** Replace entire section bag (used by Extra fields editor). */
export function setSectionBag(
	entry: KidProfileEntry,
	section: TemplateSection,
	bag: Record<string, unknown>
): KidProfileEntry {
	const path = sectionPath(section);
	if (!path) {
		// Merge root: keep other section objects, replace root scalar/map fields carefully
		const next: KidProfileEntry = { hmac: entry.hmac ?? '' };
		for (const [k, v] of Object.entries(bag)) {
			if (!isEmptyValue(v)) next[k] = v;
		}
		// Preserve nested sections not represented in bag
		for (const [k, v] of Object.entries(entry)) {
			if (k === 'hmac') continue;
			if (v && typeof v === 'object' && !Array.isArray(v) && !(k in bag)) {
				next[k] = v;
			}
		}
		if (typeof next.hmac !== 'string') next.hmac = '';
		return next;
	}

	const cleaned: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(bag)) {
		if (!isEmptyValue(v)) cleaned[k] = v;
	}
	const next: KidProfileEntry = { ...entry };
	if (Object.keys(cleaned).length === 0) {
		delete next[path];
	} else {
		next[path] = cleaned;
	}
	return next;
}

export function listExtraKeys(
	bag: Record<string, unknown>,
	section: TemplateSection
): string[] {
	const known = knownFieldNames(section);
	return Object.keys(bag).filter((k) => !known.has(k));
}

/** Top-level keys that are not hmac and not a known template section path. */
export function listTopLevelExtraKeys(
	entry: KidProfileEntry,
	template: ProfileTemplate
): string[] {
	const sectionPaths = new Set(
		template.sections.map((s) => sectionPath(s)).filter((p) => p.length > 0)
	);
	const rootFieldNames = new Set<string>();
	for (const s of template.sections) {
		if (!sectionPath(s)) {
			for (const f of s.fields) rootFieldNames.add(f.name);
		}
	}
	return Object.keys(entry).filter(
		(k) => !rootFieldNames.has(k) && !sectionPaths.has(k)
	);
}

export function countUnknownKeys(entry: KidProfileEntry, template: ProfileTemplate): number {
	let n = listTopLevelExtraKeys(entry, template).length;
	for (const section of template.sections) {
		const path = sectionPath(section);
		if (!path) continue;
		n += listExtraKeys(getSectionBag(entry, section), section).length;
	}
	return n;
}

/** Normalize string_or_list display: prefer list when array. */
export function asStringList(value: unknown): string[] {
	if (value === undefined || value === null || value === '') return [];
	if (Array.isArray(value)) return value.map((v) => String(v));
	return [String(value)];
}

export function coerceStringOrList(mode: 'string' | 'list', parts: string[]): string | string[] | undefined {
	const cleaned = parts.map((p) => p.trim()).filter(Boolean);
	if (cleaned.length === 0) return undefined;
	if (mode === 'string') return cleaned[0];
	return cleaned;
}

export type Boolish = boolean | 'True' | 'False' | 'true' | 'false';

export function parseBoolish(value: unknown): '' | 'True' | 'False' | 'true' | 'false' | 'bool-true' | 'bool-false' {
	if (value === true) return 'bool-true';
	if (value === false) return 'bool-false';
	if (value === 'True' || value === 'False' || value === 'true' || value === 'false') return value;
	return '';
}

export function encodeBoolish(
	choice: '' | 'True' | 'False' | 'true' | 'false' | 'bool-true' | 'bool-false'
): boolean | string | undefined {
	switch (choice) {
		case '':
			return undefined;
		case 'bool-true':
			return true;
		case 'bool-false':
			return false;
		default:
			return choice;
	}
}

/** Common RFC 3039 / PKIX attribute type names for subject DN whitelist. */
export const RDN_ATTRIBUTES = [
	'commonName',
	'serialNumber',
	'organizationName',
	'organizationalUnitName',
	'countryName',
	'localityName',
	'stateOrProvinceName',
	'surname',
	'givenName',
	'title',
	'emailAddress',
	'dnQualifier',
	'pseudonym'
] as const;
