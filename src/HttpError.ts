/**
 * Error thrown when a HTTP response is not OK.
 * @param {string} message - Error message.
 * @param {Response} res - Response object.
 * @property {readonly number} status - HTTP status code.
 * @property {readonly string} url - URL of the request.
 */
export class HttpResponseError extends Error {
	public readonly status: number;
	public readonly url: string;
	constructor(message: string, res: Response) {
		super(message);
		this.name = 'HttpResponseError';
		this.stack = new Error().stack;
		this.status = res.status;
		this.url = res.url;
		Error.captureStackTrace(this, this.constructor); // Creates the this.stack getter
	}
}
