import {z} from 'zod';
import {userCredentialsSchema} from './UserCredentials';

/**
 * https://www.keycloak.org/docs-api/22.0.3/rest-api/#UserRepresentation
 */
export const updateUserRequestSchema = z.object({
	credentials: z.array(userCredentialsSchema).optional(),
	email: z.string().email().optional(),
	enabled: z.boolean().optional(),
	firstName: z.string().optional(),
	id: z.string().optional(),
	lastName: z.string().optional(),
	username: z.string().optional(),
});

export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;
