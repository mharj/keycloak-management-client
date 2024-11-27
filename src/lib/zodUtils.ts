import {Err, Ok, type IResult} from '@luolapeikko/result-option';
import {type z} from 'zod';
import {isJsonResponse} from './httpUtils';

export function zodErrorToString(error: z.ZodError): string {
	return error.issues.map((issue) => `${issue.path}: ${issue.message}`).join(', ');
}

export function zodBuildError(message: string, response: z.SafeParseError<unknown>): Error {
	return new Error(`${message}: ${zodErrorToString(response.error)}`);
}

export async function handleZodResponse<T extends z.ZodTypeAny>(
	schema: T,
	response: IResult<Response, Error>,
	message: string,
): Promise<IResult<z.infer<T>, Error>> {
	if (response.isOk) {
		const res = response.ok();
		if (!isJsonResponse(res)) {
			return Err(new Error(`Invalid response content type: ${res.headers.get('content-type')}`));
		}
		const result = schema.safeParse(await res.json());
		if (result.success) {
			return Ok(result.data);
		}
		return Err(zodBuildError(message, result));
	}
	return response;
}
