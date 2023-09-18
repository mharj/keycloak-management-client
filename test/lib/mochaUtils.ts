export class WatchTestStatus {
	private statusArray: boolean[] = [];

	/**
	 * reset statusArray
	 */
	public start() {
		this.statusArray = [];
	}

	/**
	 * check test status and add to statusArray
	 * @param ctx
	 * @example
	 * describe('test', function () {
	 *   afterEach(function () {
	 *     watchTestStatus.check(this);
	 *   });
	 */
	public check(ctx: Mocha.Context): void {
		if (!ctx.currentTest) {
			throw new Error('ctx.currentTest is undefined');
		}
		this.statusArray.push(ctx.currentTest.state === 'passed');
	}

	/**
	 * Returns true if all tests passed
	 */
	public getState(): boolean {
		return this.statusArray.every((status) => status === true);
	}
}
