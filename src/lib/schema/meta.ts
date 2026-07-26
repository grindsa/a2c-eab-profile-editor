import { z } from 'zod';

/** Highest template `version` this app understands. Newer → refuse gracefully. */
export const SUPPORTED_TEMPLATE_VERSION = 1;

export const fieldTypeSchema = z.enum([
	'string',
	'secret',
	'boolish',
	'list',
	'string_or_list',
	'map'
]);

export const templateFieldSchema = z
	.object({
		name: z.string().min(1),
		type: fieldTypeSchema,
		required: z.boolean().optional(),
		help: z.string().optional(),
		encoding: z.string().optional(),
		item: z.string().optional(),
		additionalProperties: z
			.object({
				type: fieldTypeSchema
			})
			.optional()
	})
	.passthrough();

export const templateSectionSchema = z
	.object({
		id: z.string().min(1),
		label: z.string().min(1),
		path: z.string().optional(),
		additionalProperties: z.boolean().optional(),
		fields: z.array(templateFieldSchema),
		fields_add: z.array(templateFieldSchema).optional()
	})
	.passthrough();

/** Full UI template (meta-schema required set). */
export const profileTemplateSchema = z
	.object({
		version: z.number().int().min(1),
		format: z.literal('kid_profiles'),
		description: z.string().optional(),
		extends: z.string().optional(),
		entry: z.object({
			key_pattern: z.string().optional(),
			required: z.array(z.string())
		}),
		sections: z.array(templateSectionSchema).min(1),
		field_types: z.record(z.unknown()).optional()
	})
	.passthrough();

/** Overlay may omit label/fields and only supply fields_add. */
export const overlaySectionSchema = z
	.object({
		id: z.string().min(1),
		label: z.string().optional(),
		path: z.string().optional(),
		additionalProperties: z.boolean().optional(),
		fields: z.array(templateFieldSchema).optional(),
		fields_add: z.array(templateFieldSchema).optional()
	})
	.passthrough();

export const overlayTemplateSchema = z
	.object({
		extends: z.string().optional(),
		description: z.string().optional(),
		version: z.number().int().optional(),
		format: z.literal('kid_profiles').optional(),
		sections: z.array(overlaySectionSchema).optional()
	})
	.passthrough();

export type ParsedProfileTemplate = z.infer<typeof profileTemplateSchema>;
export type ParsedOverlayTemplate = z.infer<typeof overlayTemplateSchema>;

export class TemplateValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TemplateValidationError';
	}
}

export function assertSupportedVersion(version: number): void {
	if (version > SUPPORTED_TEMPLATE_VERSION) {
		throw new TemplateValidationError(
			`Template version ${version} is newer than supported version ${SUPPORTED_TEMPLATE_VERSION}. Upgrade the editor or use an older template.`
		);
	}
	if (version < 1) {
		throw new TemplateValidationError(`Invalid template version: ${version}`);
	}
}

export function formatZodError(err: z.ZodError): string {
	return err.issues
		.map((i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`)
		.join('; ');
}
