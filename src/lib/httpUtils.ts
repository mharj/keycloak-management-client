import {ILoggerLike} from '@avanio/logger-like';
import {Err, Ok, Result} from '@luolapeikko/result-option';
import {errorString} from './errorUtils';
import {FetchError} from '../FetchError';
import {HttpResponseError} from '../HttpResponseError';

export function isJsonResponse(res: Response): boolean {
	return res.headers.get('content-type')?.startsWith('application/json') ?? false;
}

type HandleReqOptions = {
	/** if enabled, 404 response is returned as undefined */
	allowNotFound?: boolean;
};

export async function handleRequest(
	fetchClient: typeof fetch,
	req: Request,
	message: string,
	realm: string,
	logger: ILoggerLike | undefined,
	{allowNotFound}: HandleReqOptions = {},
): Promise<Result<Response, FetchError | HttpResponseError>> {
	logger?.debug(`API => ${req.method}: ${req.url}`);
	try {
		const res = await fetchClient(req);
		const contentType = res.headers.get('content-type');
		logger?.debug(`API <= ${req.method}: ${res.url}: ${res.status} ${contentType}`);
		if (!res.ok) {
			if (allowNotFound && res.status === 404) {
				return Ok(res);
			}
			return Err(new HttpResponseError(`Unable to ${message} in realm ${realm}`, res));
		}
		return Ok(res);
	} catch (err) {
		return Err(new FetchError(`Unable to ${message} in realm ${realm}: ${errorString(err)}`));
	}
}

export async function handleJsonRequest(
	fetchClient: typeof fetch,
	req: Request,
	message: string,
	realm: string,
	logger: ILoggerLike | undefined,
	opt: HandleReqOptions = {},
): Promise<Result<unknown, FetchError | HttpResponseError | TypeError>> {
	const result = await handleRequest(fetchClient, req, message, realm, logger, opt);
	if (result.isErr) {
		return Err(result.err());
	}
	const res = result.ok();
	if (opt.allowNotFound && res.status === 404) {
		return Ok(undefined);
	}
	if (!isJsonResponse(res)) {
		return Err(new HttpResponseError(`Unable to ${message} in realm ${realm}: response is not JSON`, res));
	}
	try {
		return Ok(await res.json());
	} catch (err) {
		// JSON parse error
		return Err(new TypeError(`Unable to ${message} in realm ${realm}: ${errorString(err)}`));
	}
}

export async function handleVoidRequest(
	fetchClient: typeof fetch,
	req: Request,
	message: string,
	realm: string,
	logger: ILoggerLike | undefined,
	opt: HandleReqOptions = {},
): Promise<Result<void, FetchError | HttpResponseError>> {
	const result = await handleRequest(fetchClient, req, message, realm, logger, opt);
	if (result.isErr) {
		return Err(result.err());
	}
	return Ok(undefined);
}
