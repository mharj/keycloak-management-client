import {z} from 'zod';
import {groupSchemaBase} from './GetGroup';

export const createGroupSchema = z.object({
	access: z.record(z.string(), z.boolean()).optional(),
	attributes: z.record(z.string(), z.string()).optional(),
	name: z.string(),
	path: z.string().optional(),
});

export type CreateGroup = z.infer<typeof createGroupSchema>;

export const createChildGroupResponseSchema = z.object({
	attributes: z.record(z.string(), z.string()).optional(),
	clientRoles: z.record(z.string(), z.array(z.string())),
	id: z.string(),
	name: z.string(),
	path: z.string(),
	realmRoles: z.array(z.string()),
	subGroups: z.array(groupSchemaBase).optional(),
});

export type CreateChildGroupResponse = z.infer<typeof createChildGroupResponseSchema>;
