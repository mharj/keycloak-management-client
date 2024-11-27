import {type ILoggerLike} from '@avanio/logger-like';
import {Err, Ok, type IResult} from '@luolapeikko/result-option';
import {errorString} from './errorUtils';
import {FetchError} from '../FetchError';
import {HttpResponseError} from '../HttpResponseError';
import {type KeyCloakError} from '../KeyCloakManagement';

const contentTypeKey = 'content-type';

export function isJsonResponse(res: Response): boolean {
	return res.headers.get(contentTypeKey)?.startsWith('application/json') ?? false;
}

export type HandleReqOptions = {
	/** if enabled, 404 response is returned as undefined */
	allowNotFound?: boolean;
};

/**
 * Fetch request handler
 * @param fetchClient fetch client or mock
 * @param req Request object
 * @param message log message
 * @param realm current realm
 * @param logger logger like instance
 * @param opt options
 * @returns IResult with Response or error
 * @since v0.0.2
 */
export async function handleRequest(
	fetchClient: typeof fetch,
	req: Request,
	message: string,
	realm: string,
	logger: ILoggerLike | undefined,
	opt: HandleReqOptions = {},
): Promise<IResult<Response, FetchError | HttpResponseError>> {
	logger?.debug(`API => ${req.method}: ${req.url}`);
	try {
		const res = await fetchClient(req);
		const contentType = res.headers.get(contentTypeKey);
		logger?.debug(`API <= ${req.method}: ${res.url}: ${res.status} ${contentType}`);
		if (!res.ok) {
			if (opt.allowNotFound && res.status === 404) {
				return Ok(res);
			}
			return Err(new HttpResponseError(`Unable to ${message} in realm ${realm}`, res));
		}
		return Ok(res);
	} catch (err) {
		return Err(new FetchError(`Unable to ${message} in realm ${realm}: ${errorString(err)}`));
	}
}

export function handleVoidResponse(result: IResult<Response, KeyCloakError>, message: string): IResult<void, KeyCloakError> {
	if (result.isErr) {
		return Err(result.err());
	}
	const contentType = result.ok().headers.get(contentTypeKey);
	if (contentType !== null) {
		return Err(new TypeError(`${message}: Unexpected response content-type ${contentType}`));
	}
	return Ok(undefined);
}
