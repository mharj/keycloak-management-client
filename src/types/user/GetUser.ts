import {z} from 'zod';

/**
 * https://www.keycloak.org/docs-api/22.0.3/rest-api/#UserRepresentation
 */
export const getUserResponseSchema = z.object({
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

export type GetUserResponse = z.infer<typeof getUserResponseSchema>;

/**
 * Check if the data is a GetUserResponse.
 */
export function isGetUserResponse(data: unknown): data is GetUserResponse {
	return getUserResponseSchema.safeParse(data).success;
}

/**
 * Assert that the data is a GetUserResponse.
 */
export function assertGetUserResponse(data: unknown, strict?: boolean): asserts data is GetUserResponse {
	const result = strict ? getUserResponseSchema.strict().safeParse(data) : getUserResponseSchema.safeParse(data);

	if (!result.success) {
		throw new Error(`Invalid GetUserResponse: ${result.error.issues}`);
	}
}

/**
 * Assert that the data is a GetUserResponse, but only in test mode.
 */
export function assertTestGetUserResponse(data: unknown, strict?: boolean): asserts data is GetUserResponse {
	if (process.env.NODE_ENV === 'test') {
		assertGetUserResponse(data, strict);
	}
}
