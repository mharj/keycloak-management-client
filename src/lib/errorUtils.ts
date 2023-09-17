export function errorString(err: unknown): string {
	if (err instanceof Error) {
		return err.message;
	}
	if (typeof err === 'string') {
		return err;
	}
	if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
		return err.message;
	}
	return `Unknown error: ${JSON.stringify(err)}`;
}
