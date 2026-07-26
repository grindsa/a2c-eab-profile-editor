import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	parseKidProfilesJson,
	parseKidProfilesYaml,
	serializeKidProfilesYaml
} from './document';

describe('document IO', () => {
	it('parses example fixture and round-trips keyids', () => {
		const path = resolve('fixtures/example.kid_profiles.yaml');
		const raw = readFileSync(path, 'utf8');
		const doc = parseKidProfilesYaml(raw);
		expect(Object.keys(doc)).toEqual(['keyid_00', 'keyid_01', 'keyid_02', 'keyid_03']);
		expect(doc.keyid_00.hmac).toBeTruthy();
		expect(doc.keyid_03.authorization).toBeTruthy();
		const again = parseKidProfilesYaml(serializeKidProfilesYaml(doc));
		expect(Object.keys(again)).toEqual(Object.keys(doc));
	});

	it('imports JSON fixture and exports YAML preserving unknown keys', () => {
		const path = resolve('fixtures/example.kid_profiles.json');
		const raw = readFileSync(path, 'utf8');
		const doc = parseKidProfilesJson(raw);
		expect(doc.keyid_00.cahandler).toMatchObject({
			unknown_key: 'preserved_on_round_trip'
		});
		expect((doc.keyid_01.challenge as Record<string, unknown>).foward_address_check).toBe(
			'True'
		);

		const yaml = serializeKidProfilesYaml(doc);
		const again = parseKidProfilesYaml(yaml);
		expect((again.keyid_00.cahandler as Record<string, unknown>).unknown_key).toBe(
			'preserved_on_round_trip'
		);
		expect((again.keyid_01.challenge as Record<string, unknown>).foward_address_check).toBe(
			'True'
		);
		expect(yaml).toContain('unknown_key');
		expect(yaml).toContain('foward_address_check');
	});

	it('rejects non-mapping documents', () => {
		expect(() => parseKidProfilesYaml('- just a list\n')).toThrow(/mapping/);
		expect(() => parseKidProfilesJson('[]')).toThrow(/mapping/);
	});
});
