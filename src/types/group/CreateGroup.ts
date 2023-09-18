import {z} from 'zod';

export const createGroupSchema = z.object({
	access: z.record(z.string(), z.boolean()).optional(),
	attributes: z.record(z.string(), z.string()).optional(),
	name: z.string(),
	path: z.string().optional(),
});

export type CreateGroup = z.infer<typeof createGroupSchema>;
