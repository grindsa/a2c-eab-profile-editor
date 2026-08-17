import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	BUNDLED_OVERLAYS,
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
		const cahandler = knownFieldNames(tpl.sections.find((s) => s.id === 'cahandler')!);
		const order = knownFieldNames(tpl.sections.find((s) => s.id === 'order')!);
		expect(cahandler.has('ca_error_details_forward')).toBe(true);
		expect(order.has('profiles_check_disable')).toBe(true);
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

	it('ACME overlay adds URL/keyfile fields without dropping base fields', () => {
		const base = parseTemplateYaml(baseText);
		const before = base.sections.find((s) => s.id === 'cahandler')!.fields.length;
		const merged = mergeOverlay(base, parseOverlayYaml(acmeText));
		const names = knownFieldNames(merged.sections.find((s) => s.id === 'cahandler')!);
		expect(names.has('profile')).toBe(true);
		expect(names.has('acme_url')).toBe(true);
		expect(names.has('acme_keyfile')).toBe(true);
		expect(merged.sections.find((s) => s.id === 'cahandler')!.fields).toHaveLength(before + 2);
	});

	it('parses overlay that omits label/fields', () => {
		const overlay = parseOverlayYaml(xcaText);
		expect(overlay.extends).toContain('kid_profiles.template');
		expect(overlay.sections?.[0]?.fields_add?.length).toBeGreaterThan(0);
	});

	it.each(['vault', 'openxpki', 'ejbca', 'digicert', 'msca'] as const)(
		'merges %s overlay fields_add without duplicating names',
		(id) => {
			const info = BUNDLED_OVERLAYS.find((o) => o.id === id)!;
			expect(info.file).toBeTruthy();
			const overlay = parseOverlayYaml(
				readFileSync(root('templates', 'overlays', info.file!), 'utf8')
			);
			const base = parseTemplateYaml(baseText);
			const merged = mergeOverlay(base, overlay);
			const before = knownFieldNames(base.sections.find((s) => s.id === 'cahandler')!);
			const after = merged.sections.find((s) => s.id === 'cahandler')!.fields.map((f) => f.name);
			const added = overlay.sections?.[0]?.fields_add?.map((f) => f.name) ?? [];
			expect(added.length).toBeGreaterThan(0);
			for (const name of added) {
				expect(after).toContain(name);
				expect(after.filter((n) => n === name)).toHaveLength(1);
				expect(before.has(name)).toBe(false);
			}
		}
	);

	it('keeps templates/ and static/templates/ copies identical', () => {
		const files = [
			'kid_profiles.template.yaml',
			...readdirSync(root('templates', 'overlays'))
				.filter((f) => f.endsWith('.yaml'))
				.map((f) => `overlays/${f}`)
		];
		for (const rel of files) {
			const a = readFileSync(root('templates', rel), 'utf8');
			const b = readFileSync(root('static', 'templates', rel), 'utf8');
			expect(b, rel).toBe(a);
		}
		const bundledFiles = BUNDLED_OVERLAYS.map((o) => o.file).filter((f): f is string => !!f);
		for (const file of bundledFiles) {
			expect(files).toContain(`overlays/${file}`);
		}
	});
});
