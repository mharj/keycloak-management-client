import {z} from 'zod';

export const jsonRequestSchema = z.object({
	body: z.string().nullable(),
	headers: z.record(z.string(), z.string()),
	method: z.string(),
	url: z.string(),
});

export type JsonRequest = z.infer<typeof jsonRequestSchema>;
