import {z} from 'zod';

const responseType = ['basic', 'cors', 'default', 'error', 'opaque', 'opaqueredirect'] as const;

export const jsonResponseSchema = z.object({
	body: z.string().nullable(),
	headers: z.record(z.string(), z.string()),
	status: z.number(),
	statusText: z.string(),
	type: z.enum(responseType),
	url: z.string(),
});

export type JsonResponse = z.infer<typeof jsonResponseSchema>;
