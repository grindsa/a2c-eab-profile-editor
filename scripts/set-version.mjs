#!/usr/bin/env node
/**
 * Set the app version in package.json, lockfiles, tauri.conf.json, and Cargo.toml.
 * Usage: node scripts/set-version.mjs [0.3.1]
 * If omitted, reads TAG (e.g. v0.3.1) or VERSION from the environment.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseVersion(raw) {
	const value = String(raw ?? '')
		.trim()
		.replace(/^v/i, '');
	if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value)) {
		return null;
	}
	return value;
}

const version = parseVersion(process.argv[2] ?? process.env.VERSION ?? process.env.TAG);
if (!version) {
	console.error('Usage: node scripts/set-version.mjs 0.3.1');
	process.exit(1);
}

function writeJson(relPath, mutate) {
	const path = join(root, relPath);
	const data = JSON.parse(readFileSync(path, 'utf8'));
	mutate(data);
	writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

writeJson('package.json', (pkg) => {
	pkg.version = version;
});

writeJson('package-lock.json', (lock) => {
	lock.version = version;
	if (lock.packages?.['']) {
		lock.packages[''].version = version;
	}
});

writeJson('src-tauri/tauri.conf.json', (conf) => {
	conf.version = version;
});

const cargoTomlPath = join(root, 'src-tauri/Cargo.toml');
const cargoToml = readFileSync(cargoTomlPath, 'utf8');
const nextCargoToml = cargoToml.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`);
if (nextCargoToml === cargoToml) {
	console.error('Could not update version in src-tauri/Cargo.toml');
	process.exit(1);
}
writeFileSync(cargoTomlPath, nextCargoToml);

const cargoLockPath = join(root, 'src-tauri/Cargo.lock');
const cargoLock = readFileSync(cargoLockPath, 'utf8');
const nextCargoLock = cargoLock.replace(
	/(\[\[package\]\]\r?\nname = "a2c-eab-profile-editor"\r?\nversion = ")[^"]+(")/,
	`$1${version}$2`
);
if (nextCargoLock === cargoLock) {
	console.error('Could not update version in src-tauri/Cargo.lock');
	process.exit(1);
}
writeFileSync(cargoLockPath, nextCargoLock);

console.log(`Set app version to ${version}`);
