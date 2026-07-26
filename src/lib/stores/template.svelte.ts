import {
	BUNDLED_OVERLAYS,
	BUNDLED_TEMPLATE_URL,
	loadBundledOverlay,
	loadBundledTemplate,
	mergeOverlay,
	parseOverlayYaml,
	parseTemplateYaml,
	TemplateValidationError,
	type BundledOverlayInfo
} from '../schema/template';
import { SUPPORTED_TEMPLATE_VERSION } from '../schema/meta';
import type { ProfileTemplate } from '../schema/types';
import {
	basename,
	isTauriRuntime,
	pickBrowserFile,
	pickTemplatePath,
	readText
} from '../io/fs';

const STORAGE_KEY = 'a2c-eab-template-settings';

export type TemplateSourceKind = 'bundled' | 'file' | 'url';

export interface TemplateSettings {
	source: TemplateSourceKind;
	/** Absolute path (Tauri) or display name (browser) when source=file */
	filePath: string;
	url: string;
	overlayId: string;
}

const defaultSettings = (): TemplateSettings => ({
	source: 'bundled',
	filePath: '',
	url: '',
	overlayId: 'none'
});

function loadSettings(): TemplateSettings {
	if (typeof localStorage === 'undefined') return defaultSettings();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultSettings();
		const parsed = JSON.parse(raw) as Partial<TemplateSettings>;
		return {
			...defaultSettings(),
			...parsed,
			overlayId: parsed.overlayId && BUNDLED_OVERLAYS.some((o) => o.id === parsed.overlayId)
				? parsed.overlayId
				: 'none'
		};
	} catch {
		return defaultSettings();
	}
}

function persistSettings(settings: TemplateSettings): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

class TemplateStore {
	settings = $state<TemplateSettings>(defaultSettings());
	/** Draft edits on the Templates page before Apply */
	draft = $state<TemplateSettings>(defaultSettings());
	/** Last successfully applied effective template */
	template = $state<ProfileTemplate | null>(null);
	baseTemplate = $state<ProfileTemplate | null>(null);
	loadedAt = $state<string | null>(null);
	statusMessage = $state<string | null>(null);
	errorMessage = $state<string | null>(null);
	/** In-browser: last picked template file text (no durable path) */
	private browserFileText: string | null = null;

	readonly overlays: BundledOverlayInfo[] = BUNDLED_OVERLAYS;
	readonly supportedVersion = SUPPORTED_TEMPLATE_VERSION;
	readonly bundledUrl = BUNDLED_TEMPLATE_URL;

	get displaySource(): string {
		switch (this.settings.source) {
			case 'bundled':
				return 'kid_profiles.template.yaml (bundled)';
			case 'file':
				return this.settings.filePath || '(local file)';
			case 'url':
				return this.settings.url || '(URL)';
		}
	}

	get overlayLabel(): string {
		return (
			this.overlays.find((o) => o.id === this.settings.overlayId)?.label ?? this.settings.overlayId
		);
	}

	get versionLabel(): string {
		return this.template ? `v${this.template.version}` : '—';
	}

	async init(): Promise<void> {
		this.settings = loadSettings();
		this.draft = { ...this.settings };
		await this.applySettings(this.settings, { quiet: true });
	}

	resetDraft(): void {
		this.draft = { ...this.settings };
		this.errorMessage = null;
	}

	async browseLocalTemplate(): Promise<void> {
		this.errorMessage = null;
		try {
			if (isTauriRuntime()) {
				const path = await pickTemplatePath();
				if (!path) return;
				this.draft = {
					...this.draft,
					source: 'file',
					filePath: path
				};
				return;
			}
			const picked = await pickBrowserFile('.yaml,.yml,text/yaml');
			if (!picked) return;
			this.browserFileText = picked.text;
			this.draft = {
				...this.draft,
				source: 'file',
				filePath: picked.name
			};
		} catch (e) {
			this.errorMessage = e instanceof Error ? e.message : String(e);
		}
	}

	async validateDraft(): Promise<boolean> {
		this.errorMessage = null;
		this.statusMessage = null;
		try {
			await this.resolveFromSettings(this.draft);
			this.statusMessage = 'Template and overlay validated OK';
			return true;
		} catch (e) {
			this.errorMessage = e instanceof Error ? e.message : String(e);
			return false;
		}
	}

	async applyDraft(): Promise<void> {
		await this.applySettings(this.draft);
	}

	async applySettings(
		settings: TemplateSettings,
		opts: { quiet?: boolean } = {}
	): Promise<void> {
		this.errorMessage = null;
		if (!opts.quiet) this.statusMessage = null;
		try {
			const { base, effective } = await this.resolveFromSettings(settings);
			this.baseTemplate = base;
			this.template = effective;
			this.settings = { ...settings };
			this.draft = { ...settings };
			this.loadedAt = new Date().toISOString();
			persistSettings(this.settings);
			if (!opts.quiet) {
				this.statusMessage = `Applied ${basename(this.displaySource)} ${this.versionLabel}`;
			}
		} catch (e) {
			this.errorMessage = e instanceof Error ? e.message : String(e);
			if (!this.template) {
				// Ensure we always have something usable
				try {
					const base = await loadBundledTemplate();
					this.baseTemplate = base;
					this.template = base;
					this.loadedAt = new Date().toISOString();
				} catch {
					/* ignore secondary failure */
				}
			}
		}
	}

	private async resolveFromSettings(
		settings: TemplateSettings
	): Promise<{ base: ProfileTemplate; effective: ProfileTemplate }> {
		const base = await this.loadBase(settings);
		const overlay = await loadBundledOverlay(settings.overlayId);
		const effective = overlay ? mergeOverlay(base, overlay) : base;
		return { base, effective };
	}

	private async loadBase(settings: TemplateSettings): Promise<ProfileTemplate> {
		switch (settings.source) {
			case 'bundled':
				return await loadBundledTemplate();
			case 'file': {
				if (isTauriRuntime()) {
					if (!settings.filePath) {
						throw new TemplateValidationError('Choose a local template file path');
					}
					const text = await readText(settings.filePath);
					return parseTemplateYaml(text);
				}
				if (!this.browserFileText) {
					throw new TemplateValidationError(
						'Choose a local template file (browser cannot re-read paths after reload)'
					);
				}
				return parseTemplateYaml(this.browserFileText);
			}
			case 'url': {
				const url = settings.url.trim();
				if (!url) throw new TemplateValidationError('Enter a template URL');
				const res = await fetch(url);
				if (!res.ok) {
					throw new TemplateValidationError(`Failed to fetch URL (${res.status})`);
				}
				return parseTemplateYaml(await res.text());
			}
		}
	}

	/** Expose parse helpers for tests / Validate without apply side effects already covered. */
	parseTemplateYaml = parseTemplateYaml;
	parseOverlayYaml = parseOverlayYaml;
}

export const templateStore = new TemplateStore();
