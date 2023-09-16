import {ILoggerLike} from '@avanio/logger-like';
import jwtDecode from 'jwt-decode';
import {HttpResponseError} from './HttpError';
import {assertTestTokenResponse, TokenResponse} from './types/auth/TokenResponse';
import {Loadable} from './types/Loadable';
import {CreateUserRequest} from './types/user/CreateUser';
import {assertTestGetUserResponse, GetUserResponse} from './types/user/GetUser';
import {assertTestGetUserArrayResponse, GetUserArrayResponse} from './types/user/GetUserArray';
import {QueryUser} from './types/user/QueryUser';
import {UpdateUserRequest} from './types/user/UpdateUser';

type ApiCredentials = {base: string; realm: string; username: string; password: string};

export type KeyCloakManagementOptions = {
	logger?: ILoggerLike;
	fetchClient?: typeof fetch;
};

/**
 * This callback is used to validate token expiration
 */
export type TokenValidationCallback = (token: string) => boolean;

/**
 * Default token validation callback which check if token is expired
 */
const defaultTokenValidation = (token: string) => {
	const now = Date.now() / 1000;
	const data = jwtDecode(token) as {exp?: number};
	if (!data.exp) {
		throw TypeError('Token does not have exp field');
	}
	return data.exp > now;
};

export class KeyCloakManagement {
	private url: Loadable<URL>;
	private tokenResponse: TokenResponse | undefined;
	private opt: KeyCloakManagementOptions;
	private credentials: ApiCredentials | undefined;
	private tokenValidation: TokenValidationCallback;

	/**
	 * KeyCloakManagement constructor
	 * @param url loadable url to KeyCloak server
	 * @param opt optional options
	 * @param tokenValidation optional token validation callback (default: will check if token is expired, which causes a new access token to be fetched)
	 */
	constructor(url: Loadable<URL>, opt: KeyCloakManagementOptions = {}, tokenValidation: TokenValidationCallback = defaultTokenValidation) {
		this.url = url;
		this.opt = opt;
		this.tokenValidation = tokenValidation;
	}

	/**
	 * Test connection to KeyCloak with current credentials
	 */
	public async test() {
		// force to get a new token from KeyCloak
		await this.getTokenResponse(true);
	}

	/**
	 * Create a user in KeyCloak
	 *
	 * POST /admin/realms/{realm}/users
	 * @param user
	 * @returns
	 */
	public async createUser(user: CreateUserRequest): Promise<void> {
		const {base, realm} = await this.getCredentials();
		const {headers, body} = await this.buildHeaders(user);
		const req = new Request(`${base}/admin/realms/${realm}/users`, {method: 'POST', headers, body});
		await this.handleRequest(req, `create user ${user.username}`);
	}

	public async updateUser(id: string, user: UpdateUserRequest): Promise<void> {
		const {base, realm} = await this.getCredentials();
		const {headers, body} = await this.buildHeaders(user);
		const req = new Request(`${base}/admin/realms/${realm}/users/${id}`, {method: 'PUT', headers, body});
		await this.handleRequest(req, `update user ${id}`);
	}

	public async queryUser(query: QueryUser = {}): Promise<GetUserArrayResponse> {
		const {base, realm} = await this.getCredentials();
		const {headers} = await this.buildHeaders();
		const search = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, v.toString()]));
		const req = new Request(`${base}/admin/realms/${realm}/users?${search.toString()}`, {headers});
		const payload = await this.handleJsonRequest(req, `query user ${search.toString}`);
		assertTestGetUserArrayResponse(payload);
		return payload;
	}

	/**
	 * Get a user in KeyCloak with id
	 *
	 * GET /admin/realms/{realm}/users/{id}
	 * @param userId
	 * @returns
	 */
	public async getUser(userId: string): Promise<GetUserResponse | undefined> {
		const {base, realm} = await this.getCredentials();
		const {headers} = await this.buildHeaders();
		const req = new Request(`${base}/admin/realms/${realm}/users/${userId}`, {headers});
		const payload = await this.handleJsonRequest(req, `get user ${userId}`, {allowNotFound: true});
		if (payload === undefined) {
			return;
		}
		assertTestGetUserResponse(payload);
		return payload;
	}

	/**
	 * Delete a user in KeyCloak
	 *
	 * DELETE /admin/realms/{realm}/users/{id}
	 */
	public async deleteUser(id: string): Promise<void> {
		const {base, realm} = await this.getCredentials();
		const {headers} = await this.buildHeaders();
		const req = new Request(`${base}/admin/realms/${realm}/users/${id}`, {method: 'DELETE', headers});
		await this.handleRequest(req, `delete user ${id}`);
	}

	private async buildHeaders(): Promise<{headers: Headers}>;
	private async buildHeaders(data: unknown): Promise<{headers: Headers; body: string}>;
	private async buildHeaders(data?: unknown): Promise<{headers: Headers; body?: string}> {
		const headers = new Headers();
		headers.append('Authorization', `Bearer ${await this.getAccessToken()}`);
		if (data === undefined) {
			return {headers};
		}
		const body = JSON.stringify(data);
		headers.append('Content-Type', 'application/json');
		headers.append('Content-Length', body.length.toString());
		return {headers, body};
	}

	private async handleRequest(req: Request, message: string, {allowNotFound}: {allowNotFound?: boolean} = {}): Promise<Response> {
		const {realm} = await this.getCredentials();
		this.opt.logger?.debug(`API => ${req.method}: ${req.url}`);
		const res = await (this.opt?.fetchClient || fetch)(req);
		const contentType = res.headers.get('content-type');
		this.opt.logger?.debug(`API <= ${req.method}: ${res.url}: ${res.status} ${contentType}`);
		if (!res.ok) {
			if (allowNotFound && res.status === 404) {
				return res;
			}
			throw new HttpResponseError(`Unable to ${message} in realm ${realm}`, res);
		}
		return res;
	}

	private async handleJsonRequest(req: Request, message: string, opt: {allowNotFound?: boolean} = {}): Promise<unknown> {
		const res = await this.handleRequest(req, message, opt);
		if (res.status === 404) {
			return undefined;
		}
		return res.json();
	}

	/**
	 * Get a tokens from KeyCloak for the current credentials
	 */
	private async handleTokenResponse(): Promise<TokenResponse> {
		const {base, realm, username, password} = await this.getCredentials();
		const headers = new Headers({'Content-Type': 'application/x-www-form-urlencoded'});
		const body = new URLSearchParams();
		body.append('client_id', 'admin-cli');
		body.append('grant_type', 'password');
		body.append('username', username);
		body.append('password', password);
		const req = new Request(`${base}/realms/${realm}/protocol/openid-connect/token`, {method: 'POST', headers, body});
		const payload = await this.handleJsonRequest(req, 'get access token');
		assertTestTokenResponse(payload);
		return payload;
	}

	/**
	 * If we don't have a valid tokens for API, get one else return the current tokens
	 */
	private async getTokenResponse(forceNewToken?: boolean): Promise<TokenResponse> {
		if (!this.tokenResponse || !this.haveValidToken() || forceNewToken) {
			this.tokenResponse = await this.handleTokenResponse();
		}
		return this.tokenResponse;
	}

	/**
	 * Get a valid access token for API calls
	 */
	private async getAccessToken(): Promise<string> {
		return (await this.getTokenResponse()).access_token;
	}

	/**
	 * Check if token is expired
	 */
	private haveValidToken(): boolean {
		if (!this.tokenResponse) {
			return false;
		}
		return this.tokenValidation(this.tokenResponse.access_token);
	}

	/**
	 * Build API credentials from loadable url
	 */
	private async getCredentials(): Promise<ApiCredentials> {
		if (!this.credentials) {
			const url = await (typeof this.url === 'function' ? this.url() : this.url);
			const base = url.protocol + '//' + url.hostname + (url.port ? `:${url.port}` : '');
			const realm = url.pathname.split('/')[1] || 'master';
			this.credentials = {base, password: url.password, realm, username: url.username};
		}
		return this.credentials;
	}
}
