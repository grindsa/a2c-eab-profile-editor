import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseKidProfilesYaml } from '../io/document';
import { parseTemplateYaml } from '../schema/template';
import { checkKidProfiles } from './profileCheck';

const template = parseTemplateYaml(
	readFileSync(resolve('templates/kid_profiles.template.yaml'), 'utf8')
);

describe('checkKidProfiles', () => {
	it('passes the bundled example with at most infos/warnings', () => {
		const doc = parseKidProfilesYaml(
			readFileSync(resolve('fixtures/example.kid_profiles.yaml'), 'utf8')
		);
		const report = checkKidProfiles(doc, template);
		expect(report.entryCount).toBe(4);
		expect(report.errorCount).toBe(0);
		expect(report.findings.some((f) => f.code === 'summary')).toBe(true);
	});

	it('flags missing hmac and bad keyid', () => {
		const report = checkKidProfiles(
			{
				'bad kid!': { hmac: '' } as never,
				ok: { hmac: 'YWJj' }
			},
			template
		);
		expect(report.findings.some((f) => f.code === 'keyid.pattern')).toBe(true);
		expect(report.findings.some((f) => f.code === 'entry.required' || f.code === 'hmac.empty')).toBe(
			true
		);
		expect(report.findings.some((f) => f.code === 'hmac.short')).toBe(true);
		expect(report.errorCount).toBeGreaterThan(0);
	});

	it('warns when challenge validation is disabled', () => {
		const longHmac =
			'V2VfbmVlZF9hbm90aGVyX3ZlcnkfX2xvbmdfaG1hY190b19jaGVja19lYWJfZm9yX2tleWlkXzAwX2FzX2xlZ29fZW5mb3JjZXNfYW5faG1hY19sb25nZXJfdGhhbl8yNTZfYml0cw';
		const report = checkKidProfiles(
			{
				kid: {
					hmac: longHmac,
					challenge: { challenge_validation_disable: true }
				}
			},
			template
		);
		expect(report.findings.some((f) => f.code === 'security.challenge_disabled')).toBe(true);
	});

	it('errors on wrong field types and notes extras', () => {
		const longHmac =
			'V2VfbmVlZF9hbm90aGVyX3ZlcnkfX2xvbmdfaG1hY190b19jaGVja19lYWJfZm9yX2tleWlkXzAwX2FzX2xlZ29fZW5mb3JjZXNfYW5faG1hY19sb25nZXJfdGhhbl8yNTZfYml0cw';
		const report = checkKidProfiles(
			{
				kid: {
					hmac: longHmac,
					cahandler: {
						allowed_domainlist: 'not-a-list' as never,
						unknown_key: 'x'
					}
				}
			},
			template
		);
		expect(report.findings.some((f) => f.code === 'type.list')).toBe(true);
		expect(report.findings.some((f) => f.code === 'extra.key' && f.field === 'unknown_key')).toBe(
			true
		);
	});

	it('can filter to a single keyid', () => {
		const doc = parseKidProfilesYaml(
			readFileSync(resolve('fixtures/example.kid_profiles.yaml'), 'utf8')
		);
		const report = checkKidProfiles(doc, template, { keyid: 'keyid_03' });
		expect(report.entryCount).toBe(1);
		expect(report.findings.filter((f) => f.keyid && f.keyid !== 'keyid_03' && f.code !== 'summary')).toHaveLength(
			0
		);
	});
});
