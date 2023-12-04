import {z} from 'zod';

const groupSchemaBase = z.object({
	access: z.record(z.string(), z.boolean()),
	attributes: z.record(z.string(), z.string()),
	clientRoles: z.record(z.string(), z.array(z.string())),
	id: z.string(),
	name: z.string(),
	path: z.string(),
	realmRoles: z.array(z.string()),
});

export const groupSchema = groupSchemaBase.extend({
	subGroups: z.array(groupSchemaBase).optional(),
});

export type Group = z.infer<typeof groupSchema>;
