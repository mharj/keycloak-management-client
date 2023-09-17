import {z} from 'zod';
import {roleSchema} from './Role';

export const roleListSchema = z.array(roleSchema);

export type RoleList = z.infer<typeof roleListSchema>;
