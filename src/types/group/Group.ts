import {z} from 'zod';

export type Group = {
	id: string;
	name: string;
	path: string;
	subGroups?: Group[];
};

type GroupSchemaZodObject = z.ZodObject<
	{id: z.ZodString; name: z.ZodString; path: z.ZodString; subGroups: z.ZodLazy<z.ZodOptional<z.ZodArray<GroupSchemaZodObject, 'many'>>>},
	'strip',
	z.ZodTypeAny,
	{path: string; id: string; name: string; subGroups?: {path: string; id: string; name: string; subGroups?: Group[] | undefined}[] | undefined},
	{path: string; id: string; name: string; subGroups?: {path: string; id: string; name: string; subGroups?: Group[] | undefined}[] | undefined}
>;

export const groupSchema: GroupSchemaZodObject = z.object({
	id: z.string(),
	name: z.string(),
	path: z.string(),
	subGroups: z.lazy(() => groupSchema.array().optional()),
});
