import {z} from 'zod';
import {getUserSchema} from './GetUser';

export const getUserArraySchema = z.array(getUserSchema);

export type GetUserArray = z.infer<typeof getUserArraySchema>;
