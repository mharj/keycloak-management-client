import {z} from 'zod';

/**
 * https://www.keycloak.org/docs-api/22.0.3/rest-api/#UserRepresentation
 */
export const getUserSchema = z.object({
	access: z.record(z.string(), z.boolean()),
	createdTimestamp: z.number(),
	disableableCredentialTypes: z.array(z.string()),
	email: z.string().email().optional(),
	emailVerified: z.boolean(),
	enabled: z.boolean(),
	firstName: z.string().optional(),
	id: z.string().uuid(),
	lastName: z.string().optional(),
	notBefore: z.number(),
	requiredActions: z.array(z.string()),
	totp: z.boolean(),
	username: z.string(),
});

export const getUserSchemaResponse = z.union([z.undefined(), getUserSchema]);

export type GetUserResponse = z.infer<typeof getUserSchemaResponse>;
