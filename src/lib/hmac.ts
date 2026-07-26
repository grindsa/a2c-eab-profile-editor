/** Generate a cryptographically random Base64url HMAC secret (no padding). */
export function generateHmacSecret(byteLength = 32): string {
	if (byteLength < 16) {
		throw new Error('HMAC secret must be at least 16 bytes');
	}
	const bytes = new Uint8Array(byteLength);
	const cryptoObj = globalThis.crypto;
	if (!cryptoObj?.getRandomValues) {
		throw new Error('Secure random generator unavailable');
	}
	cryptoObj.getRandomValues(bytes);
	return bytesToBase64Url(bytes);
}

export function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	const b64 = globalThis.btoa(binary);
	return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function isLikelyBase64Url(value: string): boolean {
	return /^[A-Za-z0-9_-]*$/.test(value);
}
