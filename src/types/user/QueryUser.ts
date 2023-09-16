export type QueryUser = {
	id?: string;
	username?: string;
	email?: string;
	/** Pagination offset */
	first?: number;
	/** Maximum results size (defaults to 100) */
	max?: number;
};
