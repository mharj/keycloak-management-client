import {z} from 'zod';

export const getRoleSchema = z.object({
	attributes: z.record(z.string(), z.string()),
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

export type GetRole = z.infer<typeof getRoleSchema>;
