import {z} from 'zod';

export const createRoleSchema = z.object({
	attributes: z.record(z.string(), z.string()).optional(),
	/** client targeted role */
	clientRole: z.boolean().optional(),
	/** description of role */
	description: z.string().optional(),
	/** name of role */
	name: z.string(),
	/** role requires scope on request */
	scopeParamRequired: z.boolean().optional(),
});

export type CreateRole = z.infer<typeof createRoleSchema>;
