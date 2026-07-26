import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseKidProfilesYaml, serializeKidProfilesYaml } from '../io/document';
import { parseTemplateYaml } from '../schema/template';
import {
	countUnknownKeys,
	getSectionBag,
	listExtraKeys,
	setSectionField
} from './sectionData';
import type { KidProfileEntry } from '../schema/types';
import { bytesToBase64Url, generateHmacSecret, isLikelyBase64Url } from '../hmac';

describe('sectionData', () => {
	const template = parseTemplateYaml(
		readFileSync(resolve('templates/kid_profiles.template.yaml'), 'utf8')
	);
	const doc = parseKidProfilesYaml(
		readFileSync(resolve('fixtures/example.kid_profiles.yaml'), 'utf8')
	);

	it('reads nested cahandler bag and lists unknown keys after injection', () => {
		const section = template.sections.find((s) => s.id === 'cahandler')!;
		let entry = doc.keyid_00;
		entry = setSectionField(entry, section, 'unknown_key', 'keep-me');
		const bag = getSectionBag(entry, section);
		expect(bag.ca_name).toBe('example_ca');
		expect(listExtraKeys(bag, section)).toContain('unknown_key');
		expect(countUnknownKeys(entry, template)).toBeGreaterThanOrEqual(1);

		const yaml = serializeKidProfilesYaml({ keyid_00: entry });
		expect(yaml).toContain('unknown_key');
		expect(yaml).toContain('keep-me');
	});

	it('sets root hmac and list fields', () => {
		const hmacSection = template.sections.find((s) => s.id === 'hmac')!;
		const authz = template.sections.find((s) => s.id === 'authorization')!;
		let entry: KidProfileEntry = { hmac: '' };
		entry = setSectionField(entry, hmacSection, 'hmac', 'abc');
		expect(entry.hmac).toBe('abc');
		entry = setSectionField(entry, authz, 'prevalidated_domainlist', ['a.example', 'b.example']);
		expect(entry.authorization).toEqual({
			prevalidated_domainlist: ['a.example', 'b.example']
		});
		entry = setSectionField(entry, authz, 'prevalidated_domainlist', undefined);
		expect(entry.authorization).toBeUndefined();
	});
});

describe('hmac', () => {
	it('generates base64url secrets of expected shape', () => {
		const secret = generateHmacSecret(32);
		expect(secret.length).toBeGreaterThanOrEqual(43);
		expect(isLikelyBase64Url(secret)).toBe(true);
		expect(secret).not.toMatch(/[+/=]/);
		const again = generateHmacSecret(32);
		expect(again).not.toBe(secret);
	});

	it('encodes bytes as base64url', () => {
		expect(bytesToBase64Url(Uint8Array.from([0xfb, 0xff, 0xfe]))).toBe('-__-');
	});
});
