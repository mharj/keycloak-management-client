import {z} from 'zod';

export const groupCountSchema = z.object({
	count: z.number(),
});

export type GroupCount = z.infer<typeof groupCountSchema>;
