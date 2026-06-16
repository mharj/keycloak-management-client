import {z} from 'zod';

export type Group = {
	id: string;
	name: string;
	path: string;
	subGroups?: Group[];
};

export const groupSchema: z.ZodType<Group> = z.lazy(() =>
	z.object({
		id: z.string(),
		name: z.string(),
		path: z.string(),
		subGroups: z.array(groupSchema).optional(),
	}),
);
