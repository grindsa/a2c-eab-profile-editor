import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	knownFieldNames,
	mergeOverlay,
	parseOverlayYaml,
	parseTemplateYaml,
	TemplateValidationError
} from './template';
import { SUPPORTED_TEMPLATE_VERSION } from './meta';

const root = (...parts: string[]) => resolve(process.cwd(), ...parts);

describe('template load + merge', () => {
	const baseText = readFileSync(root('templates/kid_profiles.template.yaml'), 'utf8');
	const xcaText = readFileSync(root('templates/overlays/xca.yaml'), 'utf8');
	const acmeText = readFileSync(root('templates/overlays/acme.yaml'), 'utf8');

	it('parses and validates the bundled template', () => {
		const tpl = parseTemplateYaml(baseText);
		expect(tpl.format).toBe('kid_profiles');
		expect(tpl.version).toBe(1);
		expect(tpl.version).toBeLessThanOrEqual(SUPPORTED_TEMPLATE_VERSION);
		expect(tpl.sections.map((s) => s.id)).toEqual([
			'hmac',
			'cahandler',
			'challenge',
			'authorization',
			'order'
		]);
		expect(tpl.entry.required).toContain('hmac');
	});

	it('refuses unsupported template versions', () => {
		const newer = baseText.replace(/^version:\s*1/m, `version: ${SUPPORTED_TEMPLATE_VERSION + 1}`);
		expect(() => parseTemplateYaml(newer)).toThrow(TemplateValidationError);
		expect(() => parseTemplateYaml(newer)).toThrow(/newer than supported/);
	});

	it('refuses invalid format / missing sections', () => {
		expect(() => parseTemplateYaml('version: 1\nformat: nope\nentry:\n  required: []\nsections: []\n')).toThrow(
			TemplateValidationError
		);
	});

	it('merges XCA overlay fields_add without duplicating existing names', () => {
		const base = parseTemplateYaml(baseText);
		const overlay = parseOverlayYaml(xcaText);
		const merged = mergeOverlay(base, overlay);

		const cahandler = merged.sections.find((s) => s.id === 'cahandler')!;
		const names = cahandler.fields.map((f) => f.name);
		expect(names).toContain('subject');
		expect(names).toContain('issuing_ca_name');
		expect(names.filter((n) => n === 'template_name')).toHaveLength(1);
		expect(names.filter((n) => n === 'subject')).toHaveLength(1);

		// Base sections unchanged in count
		expect(merged.sections).toHaveLength(base.sections.length);
	});

	it('ACME overlay adds profile help without dropping base fields', () => {
		const base = parseTemplateYaml(baseText);
		const before = base.sections.find((s) => s.id === 'cahandler')!.fields.length;
		const merged = mergeOverlay(base, parseOverlayYaml(acmeText));
		const after = merged.sections.find((s) => s.id === 'cahandler')!.fields.length;
		// profile already in base → no net add
		expect(after).toBe(before);
		expect(knownFieldNames(merged.sections.find((s) => s.id === 'cahandler')!).has('profile')).toBe(
			true
		);
	});

	it('parses overlay that omits label/fields', () => {
		const overlay = parseOverlayYaml(xcaText);
		expect(overlay.extends).toContain('kid_profiles.template');
		expect(overlay.sections?.[0]?.fields_add?.length).toBeGreaterThan(0);
	});
});
