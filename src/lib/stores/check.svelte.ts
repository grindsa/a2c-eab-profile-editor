import { checkKidProfiles, type CheckReport } from '../check/profileCheck';
import type { KidProfilesDoc } from '../schema/types';
import { templateStore } from './template.svelte';

class CheckStore {
	report = $state<CheckReport | null>(null);
	filterKeyid = $state<string>('');
	running = $state(false);

	run(doc: KidProfilesDoc, keyid?: string | null): CheckReport | null {
		if (!templateStore.template) {
			this.report = null;
			return null;
		}
		this.running = true;
		try {
			const filter = keyid !== undefined ? keyid : this.filterKeyid || null;
			this.report = checkKidProfiles(doc, templateStore.template, {
				keyid: filter || null
			});
			return this.report;
		} finally {
			this.running = false;
		}
	}

	clear(): void {
		this.report = null;
	}
}

export const checkStore = new CheckStore();
