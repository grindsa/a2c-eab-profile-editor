import {
	parseKidProfilesJson,
	parseKidProfilesYaml,
	serializeKidProfilesYaml
} from '../io/document';
import {
	basename,
	downloadText,
	isJsonPath,
	isTauriRuntime,
	pickBrowserFile,
	pickImportJsonPath,
	pickOpenPath,
	pickSavePath,
	readText,
	writeText
} from '../io/fs';
import type { KidProfileEntry, KidProfilesDoc } from '../schema/types';

function emptyDoc(): KidProfilesDoc {
	return {};
}

function firstKey(doc: KidProfilesDoc): string | null {
	const keys = Object.keys(doc);
	return keys.length ? keys[0]! : null;
}

class DocumentStore {
	doc = $state<KidProfilesDoc>(emptyDoc());
	/** Absolute path when opened/saved via Tauri; display name in browser. */
	path = $state<string | null>(null);
	dirty = $state(false);
	selectedKeyid = $state<string | null>(null);
	statusMessage = $state<string | null>(null);
	errorMessage = $state<string | null>(null);

	get keyids(): string[] {
		return Object.keys(this.doc);
	}

	get entryCount(): number {
		return this.keyids.length;
	}

	get displayName(): string {
		if (!this.path) return 'untitled.yaml';
		return basename(this.path);
	}

	get yamlText(): string {
		return serializeKidProfilesYaml(this.doc);
	}

	clearMessages(): void {
		this.statusMessage = null;
		this.errorMessage = null;
	}

	setDoc(doc: KidProfilesDoc, path: string | null, markDirty = false): void {
		this.doc = doc;
		this.path = path;
		this.dirty = markDirty;
		if (!this.selectedKeyid || !(this.selectedKeyid in doc)) {
			this.selectedKeyid = firstKey(doc);
		}
	}

	newDocument(): void {
		this.clearMessages();
		this.setDoc(emptyDoc(), null, false);
		this.statusMessage = 'New empty document';
	}

	selectKeyid(keyid: string | null): void {
		this.selectedKeyid = keyid;
	}

	updateEntry(keyid: string, entry: KidProfileEntry): void {
		this.doc = { ...this.doc, [keyid]: entry };
		this.dirty = true;
	}

	addKeyid(keyid: string, entry?: KidProfileEntry): void {
		const id = keyid.trim();
		if (!id) throw new Error('keyid must not be empty');
		if (id in this.doc) throw new Error(`keyid already exists: ${id}`);
		this.doc = {
			...this.doc,
			[id]: entry ?? { hmac: '' }
		};
		this.selectedKeyid = id;
		this.dirty = true;
	}

	renameKeyid(from: string, to: string): void {
		const next = to.trim();
		if (!(from in this.doc)) throw new Error(`unknown keyid: ${from}`);
		if (!next) throw new Error('keyid must not be empty');
		if (next !== from && next in this.doc) throw new Error(`keyid already exists: ${next}`);
		const entry = this.doc[from]!;
		const { [from]: _, ...rest } = this.doc;
		this.doc = { ...rest, [next]: entry };
		this.selectedKeyid = next;
		this.dirty = true;
	}

	deleteKeyid(keyid: string): void {
		if (!(keyid in this.doc)) return;
		const { [keyid]: _, ...rest } = this.doc;
		this.doc = rest;
		if (this.selectedKeyid === keyid) {
			this.selectedKeyid = firstKey(rest);
		}
		this.dirty = true;
	}

	replaceFromYaml(text: string, path: string | null = this.path, markDirty = true): void {
		const doc = parseKidProfilesYaml(text);
		this.setDoc(doc, path, markDirty);
	}

	async openFile(): Promise<void> {
		this.clearMessages();
		try {
			if (isTauriRuntime()) {
				const path = await pickOpenPath();
				if (!path) return;
				const text = await readText(path);
				const doc = isJsonPath(path) ? parseKidProfilesJson(text) : parseKidProfilesYaml(text);
				this.setDoc(doc, isJsonPath(path) ? null : path, isJsonPath(path));
				if (isJsonPath(path)) {
					this.statusMessage = `Imported JSON ${basename(path)} — save as YAML to persist`;
				} else {
					this.statusMessage = `Opened ${basename(path)}`;
				}
				return;
			}

			const picked = await pickBrowserFile('.yaml,.yml,.json,application/json,text/yaml');
			if (!picked) return;
			const doc = isJsonPath(picked.name)
				? parseKidProfilesJson(picked.text)
				: parseKidProfilesYaml(picked.text);
			const asJson = isJsonPath(picked.name);
			this.setDoc(doc, asJson ? picked.name.replace(/\.json$/i, '.yaml') : picked.name, asJson);
			this.statusMessage = asJson
				? `Imported ${picked.name} — use Save to download YAML`
				: `Opened ${picked.name}`;
		} catch (e) {
			this.errorMessage = e instanceof Error ? e.message : String(e);
		}
	}

	async importJson(): Promise<void> {
		this.clearMessages();
		try {
			if (isTauriRuntime()) {
				const path = await pickImportJsonPath();
				if (!path) return;
				const text = await readText(path);
				const doc = parseKidProfilesJson(text);
				this.setDoc(doc, null, true);
				this.statusMessage = `Imported JSON ${basename(path)} — save as YAML to persist`;
				return;
			}

			const picked = await pickBrowserFile('.json,application/json');
			if (!picked) return;
			const doc = parseKidProfilesJson(picked.text);
			this.setDoc(doc, picked.name.replace(/\.json$/i, '.yaml'), true);
			this.statusMessage = `Imported ${picked.name} — use Save to download YAML`;
		} catch (e) {
			this.errorMessage = e instanceof Error ? e.message : String(e);
		}
	}

	async save(): Promise<void> {
		this.clearMessages();
		try {
			if (isTauriRuntime()) {
				if (this.path && !isJsonPath(this.path)) {
					await writeText(this.path, this.yamlText);
					this.dirty = false;
					this.statusMessage = `Saved ${basename(this.path)}`;
					return;
				}
				await this.saveAs();
				return;
			}

			// Browser: always download
			const name = this.displayName.replace(/\.json$/i, '.yaml');
			downloadText(name.endsWith('.yaml') || name.endsWith('.yml') ? name : `${name}.yaml`, this.yamlText);
			this.dirty = false;
			this.statusMessage = `Downloaded ${name}`;
		} catch (e) {
			this.errorMessage = e instanceof Error ? e.message : String(e);
		}
	}

	async saveAs(): Promise<void> {
		this.clearMessages();
		try {
			if (isTauriRuntime()) {
				const defaultName =
					this.path && !isJsonPath(this.path) ? this.path : 'kid_profiles.yaml';
				const path = await pickSavePath(defaultName);
				if (!path) return;
				const out = path.match(/\.(yaml|yml)$/i) ? path : `${path}.yaml`;
				await writeText(out, this.yamlText);
				this.path = out;
				this.dirty = false;
				this.statusMessage = `Saved ${basename(out)}`;
				return;
			}

			const name = this.displayName.replace(/\.json$/i, '.yaml');
			downloadText(name.endsWith('.yaml') || name.endsWith('.yml') ? name : `${name}.yaml`, this.yamlText);
			this.dirty = false;
			this.statusMessage = `Downloaded ${name}`;
		} catch (e) {
			this.errorMessage = e instanceof Error ? e.message : String(e);
		}
	}

	/** Load bundled fixture (dev / demo). */
	async loadBundledExample(): Promise<void> {
		this.clearMessages();
		try {
			const res = await fetch('/fixtures/example.kid_profiles.yaml');
			if (!res.ok) throw new Error(`Failed to fetch example (${res.status})`);
			const text = await res.text();
			this.setDoc(parseKidProfilesYaml(text), 'example.kid_profiles.yaml', false);
			this.statusMessage = 'Loaded bundled example';
		} catch (e) {
			this.errorMessage = e instanceof Error ? e.message : String(e);
		}
	}
}

export const documentStore = new DocumentStore();
