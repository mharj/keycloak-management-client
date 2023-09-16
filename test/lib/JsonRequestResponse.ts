import {z} from 'zod';
import {jsonRequestSchema} from './JsonRequest';
import {jsonResponseSchema} from './JsonResponse';

export const jsonRequestResponseSchema = z.object({
	req: jsonRequestSchema,
	res: jsonResponseSchema.optional(),
});
