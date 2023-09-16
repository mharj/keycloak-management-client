import {z} from 'zod';

export const tokenResponseSchema = z.object({
	access_token: z.string(),
	expires_in: z.number(),
	'not-before-policy': z.number(),
	refresh_expires_in: z.number().optional(),
	refresh_token: z.string().optional(),
	scope: z.string().optional(),
	session_state: z.string().optional(),
	token_type: z.literal('Bearer'),
});

export type TokenResponse = z.infer<typeof tokenResponseSchema>;

export function isTokenResponse(data: unknown): data is TokenResponse {
	return tokenResponseSchema.safeParse(data).success;
}

export function assertTokenResponse(data: unknown, strict?: boolean): asserts data is TokenResponse {
	const result = strict ? tokenResponseSchema.strict().safeParse(data) : tokenResponseSchema.safeParse(data);

	if (!result.success) {
		throw new Error(`Invalid KeyCloakTokenResponse: ${result.error.issues}`);
	}
}

export function assertTestTokenResponse(data: unknown, strict?: boolean): asserts data is TokenResponse {
	if (process.env.NODE_ENV === 'test') {
		assertTokenResponse(data, strict);
	}
}
