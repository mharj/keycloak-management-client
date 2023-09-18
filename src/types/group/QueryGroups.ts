export type QueryGroups = {
	search?: string;
	exact?: boolean;
	briefRepresentation?: boolean;
	/** Pagination offset */
	first?: number;
	/** Maximum results size */
	max?: number;
	populateHierarchy?: boolean;
	q?: string;
};
