import {type ILoggerLike} from '@avanio/logger-like';
import {type IResult} from '@luolapeikko/result-option';
import {type Loadable, resolveLoadable} from '@luolapeikko/ts-common';
import {type FetchError} from './FetchError';
import {type HttpResponseError} from './HttpResponseError';
import {errorString} from './lib/errorUtils';
import {type HandleReqOptions, handleRequest, handleVoidResponse} from './lib/httpUtils';
import {handleZodResponse} from './lib/zodUtils';
import {type AccessTokenCallback} from './types/auth/authToken';
import {type CreateChildGroupResponse, createChildGroupResponseSchema, type CreateGroup} from './types/group/CreateGroup';
import {type Group, groupSchema} from './types/group/Group';
import {type GroupCount, groupCountSchema} from './types/group/GroupCount';
import {type QueryGroups} from './types/group/QueryGroups';
import {type CreateRole} from './types/role/CreateRole';
import {type GetRole, getRoleSchema} from './types/role/GetRole';
import {type QueryRole} from './types/role/QueryRole';
import {type Role, roleSchema} from './types/role/Role';
import {type CreateUser} from './types/user/CreateUser';
import {type GetUser, getUserSchema} from './types/user/GetUser';
import {type QueryUser} from './types/user/QueryUser';
import {type UpdateUserRequest} from './types/user/UpdateUser';

export type KeyCloakError = HttpResponseError | FetchError | TypeError;

type UrlProps = {
	/** KeyCloak base url */
	baseUrl: URL;
};

export type KeyCloakManagementOptions = {
	logger?: ILoggerLike;
	fetchClient?: typeof fetch;
	realm?: string;
};

function buildUrlParams(params: Record<string, string | number | boolean>): Record<string, string> {
	return Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
		acc[key] = value.toString();
		return acc;
	}, {});
}

/**
 * KeyCloakManagement client for KeyCloak admin API calls
 * @since v0.0.1
 */

export class KeyCloakManagement {
	private url: Loadable<URL>;
	private credentials: UrlProps | undefined;
	private accessTokenCallback: AccessTokenCallback;
	private fetchClient: typeof fetch;
	private logger: ILoggerLike | undefined;
	private currentRealm: string;

	/**
	 * KeyCloakManagement constructor
	 * @param url loadable URL to KeyCloak server
	 * @param opt optional options
	 * @param tokenValidation optional token validation callback (default: will check if token is expired, which causes a new access token to be fetched)
	 */
	constructor(url: Loadable<URL>, accessTokenCallback: AccessTokenCallback, opt: KeyCloakManagementOptions = {}) {
		this.url = url;
		this.accessTokenCallback = accessTokenCallback;
		this.fetchClient = opt.fetchClient || (typeof window !== 'undefined' && window.fetch) || fetch;
		this.logger = opt.logger;
		this.currentRealm = opt.realm || 'master';
	}

	public async setRealm(realm: Loadable<string>): Promise<string> {
		this.currentRealm = await resolveLoadable(realm);
		return this.currentRealm;
	}

	public getRealm(): string {
		return this.currentRealm;
	}

	/**
	 * Get current group count
	 *
	 * GET /admin/realms/{realm}/groups/count
	 * @param realm optional realm, default is master
	 */
	public async getGroupCount(): Promise<IResult<GroupCount, KeyCloakError>> {
		const msg = 'get group count';
		const {realm, baseUrl, headers} = await this.buildHeaders();
		const req = new Request(`${baseUrl.href}admin/realms/${realm}/groups/count`, {headers});
		const res = await this.fetchCall(req, msg);
		return handleZodResponse(groupCountSchema, res, msg);
	}

	/**
	 * Create a group
	 *
	 * POST /admin/realms/{realm}/groups
	 * @param groups group to create
	 * @param realm optional realm, default is master
	 */
	public async createGroup(groups: CreateGroup): Promise<IResult<void, KeyCloakError>> {
		const msg = `create group ${groups.name}`;
		const {realm, baseUrl, headers, body} = await this.buildHeaders(groups);
		const req = new Request(`${baseUrl.href}admin/realms/${realm}/groups`, {headers, body, method: 'POST'});
		const res = await this.fetchCall(req, msg);
		return handleVoidResponse(res, msg);
	}

	/**
	 * Create a child group
	 *
	 * POST /admin/realms/{realm}/groups/{parentGroupId}/children
	 * @param parentGroupId parent group id
	 * @param groups group to create
	 * @param realm optional realm, default is master
	 */
	public async createChildGroup(parentGroupId: string, groups: CreateGroup): Promise<IResult<CreateChildGroupResponse, KeyCloakError>> {
		const msg = `create child group ${groups.name}`;
		const {realm, baseUrl, headers, body} = await this.buildHeaders(groups);
		const req = new Request(`${baseUrl.href}admin/realms/${realm}/groups/${parentGroupId}/children`, {headers, body, method: 'POST'});
		const res = await this.fetchCall(req, msg);
		return handleZodResponse(createChildGroupResponseSchema, res, msg);
	}

	/**
	 * Query groups
	 *
	 * GET /admin/realms/{realm}/groups
	 * @param query query parameters
	 * @param realm optional realm, default is master
	 */
	public async queryGroups(query: QueryGroups = {}): Promise<IResult<Group[], KeyCloakError>> {
		const msg = `query groups ${JSON.stringify(query)}`;
		const search = new URLSearchParams(buildUrlParams(query));
		const {realm, baseUrl, headers} = await this.buildHeaders();
		const req = new Request(`${baseUrl.href}admin/realms/${realm}/groups?${search.toString()}`, {headers});
		const res = await this.fetchCall(req, msg);
		return handleZodResponse(groupSchema.array(), res, msg);
	}

	/**
	 * Delete a group
	 *
	 * DELETE /admin/realms/{realm}/groups/{groupsId}
	 * @param groupsId group id
	 * @param realm optional realm, default is master
	 */
	public async deleteGroup(groupsId: string): Promise<IResult<void, KeyCloakError>> {
		const msg = `delete group ${groupsId}`;
		const {realm, baseUrl, headers} = await this.buildHeaders();
		const req = new Request(`${baseUrl.href}admin/realms/${realm}/groups/${groupsId}`, {headers, method: 'DELETE'});
		const res = await this.fetchCall(req, msg);
		return handleVoidResponse(res, msg);
	}

	/**
	 * Query roles
	 *
	 * GET /admin/realms/{realm}/roles
	 * @param query query parameters
	 * @param realm optional realm, default is master
	 */
	public async queryRoles(query: QueryRole = {}): Promise<IResult<Role[], KeyCloakError>> {
		const msg = `query roles ${JSON.stringify(query)}`;
		const search = new URLSearchParams(buildUrlParams(query));
		const {realm, baseUrl, headers} = await this.buildHeaders();
		const req = new Request(`${baseUrl.href}admin/realms/${realm}/roles?${search.toString()}`, {headers});
		const res = await this.fetchCall(req, msg);
		return handleZodResponse(roleSchema.array(), res, msg);
	}

	/**
	 * Create a role
	 *
	 * POST /admin/realms/{realm}/roles
	 * @param role role to create
	 * @param realm optional realm, default is master
	 */
	public async createRole(role: CreateRole): Promise<IResult<void, KeyCloakError>> {
		const msg = `create role ${role.name}`;
		const {realm, baseUrl, headers, body} = await this.buildHeaders(role);
		const req = new Request(`${baseUrl.href}admin/realms/${realm}/roles`, {headers, body, method: 'POST'});
		const res = await this.fetchCall(req, msg);
		return handleVoidResponse(res, msg);
	}

	/**
	 * Get a role
	 *
	 * GET /admin/realms/{realm}/roles/{roleName}
	 * @param roleName role name
	 * @param realm optional realm, default is master
	 */
	public async getRole(roleName: string): Promise<IResult<GetRole, KeyCloakError>> {
		const msg = `get role ${roleName}`;
		const {realm, baseUrl, headers} = await this.buildHeaders();
		const req = new Request(`${baseUrl.href}admin/realms/${realm}/roles/${roleName}`, {headers});
		const res = await this.fetchCall(req, msg);
		return handleZodResponse(getRoleSchema, res, msg);
	}

	/**
	 * Delete a role
	 *
	 * DELETE /admin/realms/{realm}/roles/{roleName}
	 * @param roleName role name
	 * @param realm optional realm, default is master
	 */
	public async deleteRole(roleName: string): Promise<IResult<void, KeyCloakError>> {
		const msg = `delete role ${roleName}`;
		const {realm, baseUrl, headers} = await this.buildHeaders();
		const req = new Request(`${baseUrl.href}admin/realms/${realm}/roles/${roleName}`, {headers, method: 'DELETE'});
		const res = await this.fetchCall(req, msg);
		return handleVoidResponse(res, msg);
	}

	/**
	 * Create a user
	 *
	 * POST /admin/realms/{realm}/users
	 * @param user User to create
	 * @param realm optional realm, default is master
	 */
	public async createUser(user: CreateUser): Promise<IResult<void, KeyCloakError>> {
		const msg = `create user ${user.username}`;
		const {realm, baseUrl, headers, body} = await this.buildHeaders(user);
		const req = new Request(`${baseUrl.href}admin/realms/${realm}/users`, {method: 'POST', headers, body});
		const res = await this.fetchCall(req, msg);
		return handleVoidResponse(res, msg);
	}

	/**
	 * Update a user
	 *
	 * PUT /admin/realms/{realm}/users/{id}
	 * @param id user id
	 * @param user User to update
	 * @param realm optional realm, default is master
	 */
	public async updateUser(id: string, user: UpdateUserRequest): Promise<IResult<void, KeyCloakError>> {
		const msg = `update user ${id}`;
		const {realm, baseUrl, headers, body} = await this.buildHeaders(user);
		const req = new Request(`${baseUrl.href}admin/realms/${realm}/users/${id}`, {method: 'PUT', headers, body});
		const res = await this.fetchCall(req, msg);
		return handleVoidResponse(res, msg);
	}

	/**
	 * Query users
	 *
	 * GET /admin/realms/{realm}/users
	 * @param query query parameters
	 * @param realm optional realm, default is master
	 */
	public async queryUser(query: QueryUser = {}): Promise<IResult<GetUser[], KeyCloakError>> {
		const msg = `query user ${JSON.stringify(query)}`;
		const {realm, baseUrl, headers} = await this.buildHeaders();
		const search = new URLSearchParams(buildUrlParams(query));
		const req = new Request(`${baseUrl.href}admin/realms/${realm}/users?${search.toString()}`, {headers});
		const res = await this.fetchCall(req, msg);
		return handleZodResponse(getUserSchema.array(), res, msg);
	}

	/**
	 * Get a user
	 *
	 * GET /admin/realms/{realm}/users/{id}
	 * @param userId
	 * @param realm optional realm, default is master
	 */
	public async getUser(userId: string): Promise<IResult<GetUser | undefined, KeyCloakError>> {
		const msg = `get user ${userId}`;
		const {realm, baseUrl, headers} = await this.buildHeaders();
		const req = new Request(`${baseUrl.href}admin/realms/${realm}/users/${userId}`, {headers});
		const res = await this.fetchCall(req, msg, {allowNotFound: true});
		return handleZodResponse(getUserSchema.optional(), res, msg);
	}

	/**
	 * Delete a user
	 *
	 * DELETE /admin/realms/{realm}/users/{id}
	 * @param id user id
	 * @param realm optional realm, default is master
	 */
	public async deleteUser(id: string): Promise<IResult<void, KeyCloakError>> {
		const msg = `delete user ${id}`;
		const {realm, baseUrl, headers} = await this.buildHeaders();
		const req = new Request(`${baseUrl.href}admin/realms/${realm}/users/${id}`, {method: 'DELETE', headers});
		const res = await this.fetchCall(req, msg);
		return handleVoidResponse(res, msg);
	}

	private async buildHeaders(): Promise<{headers: Headers; baseUrl: URL; realm: string}>;
	private async buildHeaders(data: unknown): Promise<{headers: Headers; baseUrl: URL; body: string; realm: string}>;
	private async buildHeaders(data?: unknown): Promise<{headers: Headers; baseUrl: URL; body?: string; realm: string}> {
		const {baseUrl} = await this.getCredentials();
		const headers = new Headers();
		headers.append('Authorization', `Bearer ${await this.accessTokenCallback()}`);
		if (data === undefined || data === null) {
			return {baseUrl, headers, realm: this.currentRealm};
		}
		// attach body headers and return also body as string
		const body = JSON.stringify(data);
		headers.append('Content-Type', 'application/json');
		headers.append('Content-Length', body.length.toString());
		return {baseUrl, body, headers, realm: this.currentRealm};
	}

	/**
	 * return API credentials from URL
	 */
	private async getCredentials(): Promise<UrlProps> {
		if (!this.credentials) {
			const url = await resolveLoadable(this.url);
			try {
				this.credentials = this.parseBaseUrl(url);
			} catch (e) {
				throw new TypeError(`Invalid KeyCloak url: ${url.href} (${errorString(e)})`);
			}
		}
		return this.credentials;
	}

	/**
	 * Build base url string from URL
	 */
	private parseBaseUrl(url: URL): UrlProps {
		const baseUrl = new URL(url);
		baseUrl.pathname = '';
		baseUrl.username = '';
		baseUrl.password = '';
		return {baseUrl};
	}

	private async fetchCall(req: Request, message: string, opt: HandleReqOptions = {}): Promise<IResult<Response, KeyCloakError>> {
		return handleRequest(this.fetchClient, req, message, this.currentRealm, this.logger, opt);
	}
}
