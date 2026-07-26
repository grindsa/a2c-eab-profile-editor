/**
 * File open/save via Tauri dialogs, with browser fallbacks for `npm run dev`.
 */
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

export function isTauriRuntime(): boolean {
	return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const YAML_FILTERS = [
	{ name: 'kid_profiles YAML', extensions: ['yaml', 'yml'] },
	{ name: 'All files', extensions: ['*'] }
];

const OPEN_FILTERS = [
	{ name: 'kid_profiles', extensions: ['yaml', 'yml', 'json'] },
	{ name: 'YAML', extensions: ['yaml', 'yml'] },
	{ name: 'JSON', extensions: ['json'] },
	{ name: 'All files', extensions: ['*'] }
];

const JSON_FILTERS = [
	{ name: 'JSON fixtures', extensions: ['json'] },
	{ name: 'All files', extensions: ['*'] }
];

export async function pickOpenPath(): Promise<string | null> {
	if (!isTauriRuntime()) return null;
	const selected = await open({
		multiple: false,
		directory: false,
		title: 'Open kid_profiles',
		filters: OPEN_FILTERS
	});
	if (selected === null) return null;
	return typeof selected === 'string' ? selected : selected[0] ?? null;
}

export async function pickSavePath(defaultPath?: string): Promise<string | null> {
	if (!isTauriRuntime()) return null;
	return await save({
		title: 'Save kid_profiles YAML',
		filters: YAML_FILTERS,
		defaultPath: defaultPath ?? 'kid_profiles.yaml'
	});
}

export async function pickImportJsonPath(): Promise<string | null> {
	if (!isTauriRuntime()) return null;
	const selected = await open({
		multiple: false,
		directory: false,
		title: 'Import JSON fixture',
		filters: JSON_FILTERS
	});
	if (selected === null) return null;
	return typeof selected === 'string' ? selected : selected[0] ?? null;
}

export async function pickTemplatePath(): Promise<string | null> {
	if (!isTauriRuntime()) return null;
	const selected = await open({
		multiple: false,
		directory: false,
		title: 'Open UI template YAML',
		filters: YAML_FILTERS
	});
	if (selected === null) return null;
	return typeof selected === 'string' ? selected : selected[0] ?? null;
}

export async function readText(path: string): Promise<string> {
	if (!isTauriRuntime()) {
		throw new Error('readText requires Tauri; use browser file picker fallback');
	}
	return await readTextFile(path);
}

export async function writeText(path: string, contents: string): Promise<void> {
	if (!isTauriRuntime()) {
		throw new Error('writeText requires Tauri; use browser download fallback');
	}
	await writeTextFile(path, contents);
}

/** Browser: open a local text file via hidden input. */
export function pickBrowserFile(accept: string): Promise<{ name: string; text: string } | null> {
	return new Promise((resolve) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = accept;
		input.style.display = 'none';
		input.addEventListener('change', async () => {
			const file = input.files?.[0];
			input.remove();
			if (!file) {
				resolve(null);
				return;
			}
			resolve({ name: file.name, text: await file.text() });
		});
		document.body.appendChild(input);
		input.click();
	});
}

/** Browser: trigger a download of text content. */
export function downloadText(filename: string, contents: string, mime = 'text/yaml'): void {
	const blob = new Blob([contents], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export function basename(path: string): string {
	const parts = path.replace(/\\/g, '/').split('/');
	return parts[parts.length - 1] || path;
}

export function isJsonPath(path: string): boolean {
	return /\.json$/i.test(path);
}
