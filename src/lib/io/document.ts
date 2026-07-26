import { parse, stringify } from 'yaml';
import type { KidProfilesDoc } from '../schema/types';

function assertKidProfilesMapping(data: unknown, kind: 'YAML' | 'JSON'): KidProfilesDoc {
	if (data === null || typeof data !== 'object' || Array.isArray(data)) {
		throw new Error(`kid_profiles document must be a ${kind} mapping of keyid → entry`);
	}
	return data as KidProfilesDoc;
}

export function parseKidProfilesYaml(text: string): KidProfilesDoc {
	return assertKidProfilesMapping(parse(text), 'YAML');
}

export function parseKidProfilesJson(text: string): KidProfilesDoc {
	return assertKidProfilesMapping(JSON.parse(text) as unknown, 'JSON');
}

export function serializeKidProfilesYaml(doc: KidProfilesDoc): string {
	return stringify(doc, { lineWidth: 0, defaultKeyType: 'PLAIN' });
}

/** Prefer stable keyid order; preserve entry keys as serialized by `yaml`. */
export function listKeyids(doc: KidProfilesDoc): string[] {
	return Object.keys(doc);
}
