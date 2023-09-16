import {z} from 'zod';
import {getUserResponseSchema} from './GetUser';

export const keyCloakGetUserArrayRepresentationSchema = z.array(getUserResponseSchema);
const keyCloakGetUserArrayRepresentationStrictSchema = z.array(getUserResponseSchema.strict());

export type GetUserArrayResponse = z.infer<typeof keyCloakGetUserArrayRepresentationSchema>;

export function isKeyCloakGetUserArrayResponse(data: unknown): data is GetUserArrayResponse {
	return keyCloakGetUserArrayRepresentationSchema.safeParse(data).success;
}

export function assertGetUserArrayResponse(data: unknown, strict?: boolean): asserts data is GetUserArrayResponse {
	const result = strict ? keyCloakGetUserArrayRepresentationStrictSchema.safeParse(data) : keyCloakGetUserArrayRepresentationSchema.safeParse(data);

	if (!result.success) {
		throw new Error(`Invalid GetUserArray: ${result.error.issues}`);
	}
}

export function assertTestGetUserArrayResponse(data: unknown, strict?: boolean): asserts data is GetUserArrayResponse {
	if (process.env.NODE_ENV === 'test') {
		assertGetUserArrayResponse(data, strict);
	}
}
