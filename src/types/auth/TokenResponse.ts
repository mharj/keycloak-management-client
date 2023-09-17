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
