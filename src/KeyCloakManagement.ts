import {ILoggerLike} from '@avanio/logger-like';
import {Result} from 'mharj-result';
import {FetchError} from './FetchError';
import {HttpResponseError} from './HttpResponseError';
import {errorString} from './lib/errorUtils';
import {handleJsonRequest, handleVoidRequest} from './lib/httpUtils';
import {testAssertSchema} from './lib/zodUtils';
import {AccessTokenCallback} from './types/auth/authToken';
import {GroupCount, groupCountSchema} from './types/group/GroupCount';
import {Loadable} from './types/Loadable';
import {CreateRole} from './types/role/CreateRole';
import {GetRole, getRoleSchema} from './types/role/GetRole';
import {QueryRole} from './types/role/QueryRole';
import {RoleList, roleListSchema} from './types/role/RoleList';
import {CreateUserRequest} from './types/user/CreateUser';
import {GetUserResponse, getUserSchemaResponse} from './types/user/GetUser';
import {GetUserArray, getUserArraySchema} from './types/user/GetUserArray';
import {QueryUser} from './types/user/QueryUser';
import {UpdateUserRequest} from './types/user/UpdateUser';

type KeyCloakError = HttpResponseError | FetchError | TypeError;

type ApiCredentials = {
	/** KeyCloak base url */
	base: string;
};

export type KeyCloakManagementOptions = {
	logger?: ILoggerLike;
	fetchClient?: typeof fetch;
};

/**
 * This callback is used to validate token expiration
 */

export class KeyCloakManagement {
	private url: Loadable<URL>;
	// private opt: KeyCloakManagementOptions;
	private credentials: ApiCredentials | undefined;
	private accessTokenCallback: AccessTokenCallback;
	private fetchClient: typeof fetch;
	private logger: ILoggerLike | undefined;

	/**
	 * KeyCloakManagement constructor
	 * @param url loadable url to KeyCloak server
	 * @param opt optional options
	 * @param tokenValidation optional token validation callback (default: will check if token is expired, which causes a new access token to be fetched)
	 */
	constructor(url: Loadable<URL>, accessTokenCallback: AccessTokenCallback, opt: KeyCloakManagementOptions = {}) {
		this.url = url;
		this.accessTokenCallback = accessTokenCallback;
		this.fetchClient = opt.fetchClient || fetch;
		this.logger = opt.logger;
	}

	public async getGroupCount(realm: string = 'master'): Promise<Result<GroupCount, KeyCloakError>> {
		const {base, headers} = await this.buildHeaders();
		const req = new Request(`${base}/admin/realms/${realm}/groups/count`, {headers});
		const result = await handleJsonRequest(this.fetchClient, req, 'get group count', realm, this.logger);
		testAssertSchema(groupCountSchema, result);
		return result;
	}

	public async queryRoles(query: QueryRole = {}, realm: string = 'master'): Promise<Result<RoleList, KeyCloakError>> {
		const search = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, v.toString()]));
		const {base, headers} = await this.buildHeaders();
		const req = new Request(`${base}/admin/realms/${realm}/roles?${search.toString()}`, {headers});
		const result = await handleJsonRequest(this.fetchClient, req, 'list roles', realm, this.logger);
		testAssertSchema(roleListSchema, result);
		return result;
	}

	public async createRole(role: CreateRole, realm: string = 'master'): Promise<Result<void, KeyCloakError>> {
		const {base, headers, body} = await this.buildHeaders(role);
		const req = new Request(`${base}/admin/realms/${realm}/roles`, {headers, body, method: 'POST'});
		return handleVoidRequest(this.fetchClient, req, `create role ${role.name}`, realm, this.logger);
	}

	public async getRole(roleName: string, realm: string = 'master'): Promise<Result<GetRole, KeyCloakError>> {
		const {base, headers} = await this.buildHeaders();
		const req = new Request(`${base}/admin/realms/${realm}/roles/${roleName}`, {headers});
		const result = await handleJsonRequest(this.fetchClient, req, `get role ${roleName}`, realm, this.logger);
		testAssertSchema(getRoleSchema, result);
		return result;
	}

	public async deleteRole(roleName: string, realm: string = 'master'): Promise<Result<void, KeyCloakError>> {
		const {base, headers} = await this.buildHeaders();
		const req = new Request(`${base}/admin/realms/${realm}/roles/${roleName}`, {headers, method: 'DELETE'});
		return handleVoidRequest(this.fetchClient, req, `delete role ${roleName}`, realm, this.logger);
	}

	/**
	 * Create a user in KeyCloak
	 *
	 * POST /admin/realms/{realm}/users
	 * @param user
	 * @returns
	 */
	public async createUser(user: CreateUserRequest, realm: string = 'master'): Promise<Result<void, KeyCloakError>> {
		const {base, headers, body} = await this.buildHeaders(user);
		const req = new Request(`${base}/admin/realms/${realm}/users`, {method: 'POST', headers, body});
		return handleVoidRequest(this.fetchClient, req, `create user ${user.username}`, realm, this.logger);
	}

	public async updateUser(id: string, user: UpdateUserRequest, realm: string = 'master'): Promise<Result<void, KeyCloakError>> {
		const {base, headers, body} = await this.buildHeaders(user);
		const req = new Request(`${base}/admin/realms/${realm}/users/${id}`, {method: 'PUT', headers, body});
		return handleVoidRequest(this.fetchClient, req, `update user ${id}`, realm, this.logger);
	}

	public async queryUser(query: QueryUser = {}, realm: string = 'master'): Promise<Result<GetUserArray, KeyCloakError>> {
		const {base, headers} = await this.buildHeaders();
		const search = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, v.toString()]));
		const req = new Request(`${base}/admin/realms/${realm}/users?${search.toString()}`, {headers});
		const result = await handleJsonRequest(this.fetchClient, req, `query user ${search.toString}`, realm, this.logger);
		testAssertSchema(getUserArraySchema, result);
		return result;
	}

	/**
	 * Get a user in KeyCloak with id
	 *
	 * GET /admin/realms/{realm}/users/{id}
	 * @param userId
	 * @returns
	 */
	public async getUser(userId: string, realm: string = 'master'): Promise<Result<GetUserResponse, KeyCloakError>> {
		const {base, headers} = await this.buildHeaders();
		const req = new Request(`${base}/admin/realms/${realm}/users/${userId}`, {headers});
		const result = await handleJsonRequest(this.fetchClient, req, `get user ${userId}`, realm, this.logger, {allowNotFound: true});
		testAssertSchema(getUserSchemaResponse, result);
		return result;
	}

	/**
	 * Delete a user in KeyCloak
	 *
	 * DELETE /admin/realms/{realm}/users/{id}
	 */
	public async deleteUser(id: string, realm: string = 'master'): Promise<Result<void, KeyCloakError>> {
		const {base, headers} = await this.buildHeaders();
		const req = new Request(`${base}/admin/realms/${realm}/users/${id}`, {method: 'DELETE', headers});
		return handleVoidRequest(this.fetchClient, req, `delete user ${id}`, realm, this.logger);
	}

	private async buildHeaders(): Promise<{headers: Headers; base: string}>;
	private async buildHeaders(data: unknown): Promise<{headers: Headers; base: string; body: string}>;
	private async buildHeaders(data?: unknown): Promise<{headers: Headers; base: string; body?: string}> {
		const {base} = await this.getCredentials();
		const headers = new Headers();
		headers.append('Authorization', `Bearer ${await this.accessTokenCallback()}`);
		if (data === undefined || data === null) {
			return {base, headers};
		}
		// attach body headers and return also body as string
		const body = JSON.stringify(data);
		headers.append('Content-Type', 'application/json');
		headers.append('Content-Length', body.length.toString());
		return {base, body, headers};
	}

	/**
	 * return API credentials from URL
	 */
	private async getCredentials(): Promise<ApiCredentials> {
		if (!this.credentials) {
			try {
				this.credentials = this.parseCredentials(await (typeof this.url === 'function' ? this.url() : this.url));
			} catch (e) {
				throw new TypeError(`Invalid KeyCloak url: ${this.url} (${errorString(e)})`);
			}
		}
		return this.credentials;
	}

	/**
	 * Build API credentials from URL, paths can be in 3 forms:
	 * - /realms/{realm} => loginRealm = {realm}
	 * - /{realm} => loginRealm = {realm}
	 * - / => loginRealm = master
	 */
	private parseCredentials(url: URL): ApiCredentials {
		const base = url.protocol + '//' + url.hostname + (url.port ? `:${url.port}` : '');
		return {base};
	}
}
