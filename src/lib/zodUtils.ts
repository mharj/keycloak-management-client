import {Result} from 'mharj-result';
import {z} from 'zod';

export function zodErrorToString(error: z.ZodError): string {
	return error.issues.map((issue) => `${issue.path}: ${issue.message}`).join(', ');
}

export function zodBuildError(message: string, response: z.SafeParseError<unknown>): Error {
	return new Error(`${message}: ${zodErrorToString(response.error)}`);
}

export function assertSchema<T extends z.ZodTypeAny, ErrorType = unknown>(
	schema: T,
	input: Result<unknown, ErrorType>,
): asserts input is Result<z.infer<T>, ErrorType> {
	if (input.isOk) {
		const result = schema.safeParse(input.ok());
		if (!result.success) {
			throw zodBuildError('Invalid GroupCount', result);
		}
	}
}

export function testAssertSchema<T extends z.ZodTypeAny, ErrorType = unknown>(
	schema: T,
	input: Result<unknown, ErrorType>,
): asserts input is Result<z.infer<T>, ErrorType> {
	if (process.env.NODE_ENV === 'test' && input.isOk) {
		const result = schema.safeParse(input.ok());
		if (!result.success) {
			throw zodBuildError('Invalid GroupCount', result);
		}
	}
}
