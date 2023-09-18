import {z} from 'zod';

export const roleSchema = z.object({
	/** client targeted role */
	clientRole: z.boolean(),
	composite: z.boolean(),
	containerId: z.string(),
	/** description of role */
	description: z.string().optional(),
	/** role id */
	id: z.string(),
	/** name of role */
	name: z.string(),
});

export type Role = z.infer<typeof roleSchema>;
