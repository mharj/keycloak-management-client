import {z} from 'zod';

export const userCredentialsSchema = z.object({
	type: z.literal('password'),
	value: z.string(),
	temporary: z.boolean(),
});

export type UserCredentials = z.infer<typeof userCredentialsSchema>;
