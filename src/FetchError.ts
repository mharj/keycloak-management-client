/**
 * fetch clients have different fatal error classes, this class is used to unify them
 */
export class FetchError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'FetchError';
		Error.captureStackTrace(this, this.constructor); // Creates the this.stack getter
	}
}
