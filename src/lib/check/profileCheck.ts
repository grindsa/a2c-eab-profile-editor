import { isLikelyBase64Url } from '../hmac';
import { getSectionBag, sectionPath } from '../entry/sectionData';
import { knownFieldNames } from '../schema/template';
import type {
	KidProfileEntry,
	KidProfilesDoc,
	ProfileTemplate,
	TemplateField,
	TemplateSection
} from '../schema/types';

export type CheckSeverity = 'error' | 'warning' | 'info';

export interface CheckFinding {
	severity: CheckSeverity;
	code: string;
	message: string;
	keyid?: string;
	section?: string;
	field?: string;
}

export interface CheckReport {
	checkedAt: string;
	entryCount: number;
	findings: CheckFinding[];
	errorCount: number;
	warningCount: number;
	infoCount: number;
}

export interface CheckOptions {
	/** When set, only validate this keyid */
	keyid?: string | null;
}

function countBySeverity(findings: CheckFinding[]): Pick<
	CheckReport,
	'errorCount' | 'warningCount' | 'infoCount'
> {
	let errorCount = 0;
	let warningCount = 0;
	let infoCount = 0;
	for (const f of findings) {
		if (f.severity === 'error') errorCount++;
		else if (f.severity === 'warning') warningCount++;
		else infoCount++;
	}
	return { errorCount, warningCount, infoCount };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
	return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function validateFieldType(
	field: TemplateField,
	value: unknown,
	ctx: { keyid: string; section: string }
): CheckFinding[] {
	const out: CheckFinding[] = [];
	const base = {
		keyid: ctx.keyid,
		section: ctx.section,
		field: field.name
	};

	switch (field.type) {
		case 'string':
		case 'secret':
			if (typeof value !== 'string') {
				out.push({
					...base,
					severity: 'error',
					code: 'type.string',
					message: `Expected string for ${field.name}, got ${describeType(value)}`
				});
			} else if (field.encoding === 'base64url' || field.name === 'hmac') {
				if (!value) {
					out.push({
						...base,
						severity: 'error',
						code: 'hmac.empty',
						message: 'hmac must not be empty'
					});
				} else if (!isLikelyBase64Url(value)) {
					out.push({
						...base,
						severity: 'error',
						code: 'hmac.charset',
						message: 'hmac should be Base64url (A-Z, a-z, 0-9, -, _)'
					});
				} else if (value.length < 43) {
					out.push({
						...base,
						severity: 'warning',
						code: 'hmac.short',
						message:
							'hmac looks shorter than ~256 bits of Base64url (43+ chars recommended)'
					});
				}
			}
			break;

		case 'boolish':
			if (
				!(
					typeof value === 'boolean' ||
					value === 'True' ||
					value === 'False' ||
					value === 'true' ||
					value === 'false'
				)
			) {
				out.push({
					...base,
					severity: 'error',
					code: 'type.boolish',
					message: `${field.name} should be boolean or "True"/"False"/"true"/"false"`
				});
			} else if (
				field.name === 'challenge_validation_disable' &&
				(value === true || value === 'True' || value === 'true')
			) {
				out.push({
					...base,
					severity: 'warning',
					code: 'security.challenge_disabled',
					message:
						'challenge_validation_disable is enabled — severe security impact unless tightly allowlisted'
				});
			}
			break;

		case 'list':
			if (!Array.isArray(value) || value.some((x) => typeof x !== 'string')) {
				out.push({
					...base,
					severity: 'error',
					code: 'type.list',
					message: `${field.name} should be a list of strings`
				});
			} else if (value.length === 0) {
				out.push({
					...base,
					severity: 'info',
					code: 'list.empty',
					message: `${field.name} is an empty list`
				});
			}
			break;

		case 'string_or_list':
			if (typeof value === 'string') {
				/* ok */
			} else if (Array.isArray(value) && value.every((x) => typeof x === 'string')) {
				if (value.length === 0) {
					out.push({
						...base,
						severity: 'info',
						code: 'list.empty',
						message: `${field.name} is an empty list`
					});
				}
			} else {
				out.push({
					...base,
					severity: 'error',
					code: 'type.string_or_list',
					message: `${field.name} should be a string or list of strings`
				});
			}
			break;

		case 'map':
			if (!isPlainObject(value)) {
				out.push({
					...base,
					severity: 'error',
					code: 'type.map',
					message: `${field.name} should be a mapping of RDN → string | list | "*"`
				});
			} else {
				for (const [attr, v] of Object.entries(value)) {
					const ok =
						typeof v === 'string' ||
						(Array.isArray(v) && v.every((x) => typeof x === 'string'));
					if (!ok) {
						out.push({
							...base,
							severity: 'error',
							code: 'type.map.value',
							message: `${field.name}.${attr} should be a string, "*", or list of strings`
						});
					}
				}
			}
			break;
	}

	return out;
}

function describeType(value: unknown): string {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	return typeof value;
}

function checkEntry(
	keyid: string,
	entry: KidProfileEntry,
	template: ProfileTemplate
): CheckFinding[] {
	const findings: CheckFinding[] = [];
	const pattern = template.entry.key_pattern
		? new RegExp(template.entry.key_pattern)
		: null;

	if (pattern && !pattern.test(keyid)) {
		findings.push({
			severity: 'error',
			code: 'keyid.pattern',
			keyid,
			message: `keyid "${keyid}" does not match pattern ${template.entry.key_pattern}`
		});
	}

	if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
		findings.push({
			severity: 'error',
			code: 'entry.shape',
			keyid,
			message: 'Entry must be a mapping'
		});
		return findings;
	}

	for (const req of template.entry.required) {
		const v = (entry as Record<string, unknown>)[req];
		if (v === undefined || v === null || v === '') {
			findings.push({
				severity: 'error',
				code: 'entry.required',
				keyid,
				field: req,
				message: `Required field "${req}" is missing or empty`
			});
		}
	}

	const knownSectionPaths = new Set(
		template.sections.map((s) => sectionPath(s)).filter((p) => p.length > 0)
	);

	for (const [k, v] of Object.entries(entry)) {
		if (k === 'hmac') continue;
		if (knownSectionPaths.has(k) && v != null && !isPlainObject(v)) {
			findings.push({
				severity: 'error',
				code: 'section.shape',
				keyid,
				section: k,
				message: `Section "${k}" must be a mapping`
			});
		}
	}

	for (const section of template.sections) {
		findings.push(...checkSection(keyid, entry, section));
	}

	return findings;
}

function checkSection(
	keyid: string,
	entry: KidProfileEntry,
	section: TemplateSection
): CheckFinding[] {
	const findings: CheckFinding[] = [];
	const path = sectionPath(section);
	if (path) {
		const raw = entry[path];
		if (raw === undefined) return findings;
		if (!isPlainObject(raw)) return findings; // shape error already emitted
	}

	const bag = getSectionBag(entry, section);
	const known = knownFieldNames(section);

	for (const field of section.fields) {
		const value = bag[field.name];
		if (value === undefined) {
			if (field.required) {
				findings.push({
					severity: 'error',
					code: 'field.required',
					keyid,
					section: section.id,
					field: field.name,
					message: `Required field "${field.name}" is missing`
				});
			}
			continue;
		}
		findings.push(
			...validateFieldType(field, value, { keyid, section: section.id })
		);
	}

	if (section.additionalProperties !== false) {
		for (const key of Object.keys(bag)) {
			if (known.has(key)) continue;
			findings.push({
				severity: 'info',
				code: 'extra.key',
				keyid,
				section: section.id,
				field: key,
				message: `Unknown key "${key}" in ${section.id} (preserved on save)`
			});
		}
	}

	return findings;
}

/**
 * Validate a kid_profiles document against the active UI template.
 * Complements upstream `eab_chk.py`, which mostly dumps/summary-loads the key file.
 */
export function checkKidProfiles(
	doc: KidProfilesDoc,
	template: ProfileTemplate,
	options: CheckOptions = {}
): CheckReport {
	const findings: CheckFinding[] = [];
	const keys = Object.keys(doc);
	const filter = options.keyid?.trim() || null;
	const selected = filter ? keys.filter((k) => k === filter) : keys;

	if (filter && selected.length === 0) {
		findings.push({
			severity: 'error',
			code: 'keyid.missing',
			keyid: filter,
			message: `keyid "${filter}" not found in document`
		});
	}

	if (!filter && keys.length === 0) {
		findings.push({
			severity: 'warning',
			code: 'doc.empty',
			message: 'Document has no keyid entries'
		});
	}

	findings.push({
		severity: 'info',
		code: 'summary',
		message: `Summary: ${selected.length} entr${selected.length === 1 ? 'y' : 'ies'} checked`
	});

	for (const keyid of selected) {
		findings.push(...checkEntry(keyid, doc[keyid]!, template));
	}

	const counts = countBySeverity(findings);
	return {
		checkedAt: new Date().toISOString(),
		entryCount: selected.length,
		findings,
		...counts
	};
}
