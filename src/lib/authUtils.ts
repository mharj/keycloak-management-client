import jwtDecode from 'jwt-decode';
export type TokenValidationCallback = (token: string) => boolean;

/**
 * Default token validation callback which check if token is expired
 */
export const defaultTokenValidation: TokenValidationCallback = (token) => {
	const now = Date.now() / 1000;
	const data = jwtDecode<{exp?: number}>(token);
	if (!data.exp) {
		throw TypeError('Token does not have exp field!');
	}
	return data.exp > now;
};
