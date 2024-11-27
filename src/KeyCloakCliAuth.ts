import {type ILoggerLike} from '@avanio/logger-like';
import {type IResult} from '@luolapeikko/result-option';
import {type Loadable, resolveLoadable} from '@luolapeikko/ts-common';
import {type FetchError} from './FetchError';
import {type HttpResponseError} from './HttpResponseError';
import {type TokenValidationCallback, defaultTokenValidation} from './lib/authUtils';
import {errorString} from './lib/errorUtils';
import {handleRequest} from './lib/httpUtils';
import {handleZodResponse} from './lib/zodUtils';
import {type TokenResponse, tokenResponseSchema} from './types/auth/TokenResponse';

type ApiCredentials = {
	/** KeyCloak base url */
	base: string;
	/** KeyCloak login realm */
	loginRealm: string;
	/** KeyCloak admin username */
	username: string;
	/** KeyCloak admin password */
	password: string;
};

export type CliAuthOptions = {
	logger?: ILoggerLike;
	fetchClient?: typeof fetch;
	tokenValidation?: TokenValidationCallback;
};

export class CliAuth {
	private url: Loadable<URL>;
	private tokenResponse: TokenResponse | undefined;
	private credentials: ApiCredentials | undefined;
	private tokenValidation: TokenValidationCallback;
	private logger: ILoggerLike | undefined;
	private fetchClient: typeof fetch;
	constructor(url: Loadable<URL>, opt: CliAuthOptions = {}) {
		this.url = url;
		this.logger = opt.logger;
		this.tokenValidation = opt.tokenValidation || defaultTokenValidation;
		this.fetchClient = opt.fetchClient || fetch;
		this.getAccessToken = this.getAccessToken.bind(this);
	}

	public async getAccessToken(): Promise<string> {
		return (await this.getTokenResponse()).access_token;
	}

	public async login(forceNewLogin?: boolean): Promise<void> {
		await this.getTokenResponse(forceNewLogin);
	}

	private async getTokenResponse(forceNewToken?: boolean): Promise<TokenResponse> {
		if (!this.tokenResponse || !this.haveValidToken() || forceNewToken) {
			this.tokenResponse = await this.handleTokenResponse();
		}
		return this.tokenResponse;
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

	/* 	private async getAccessToken(): Promise<string> {
		return (await this.getTokenResponse()).access_token;
	} */

	/**
	 * Get a tokens from KeyCloak for the current credentials
	 */
	private async handleTokenResponse(): Promise<TokenResponse> {
		const msg = 'get access token';
		const {base, loginRealm, username, password} = await this.getCredentials();
		const headers = new Headers({'Content-Type': 'application/x-www-form-urlencoded'});
		const body = new URLSearchParams();
		body.append('client_id', 'admin-cli');
		body.append('grant_type', 'password');
		body.append('username', username);
		body.append('password', password);
		const req = new Request(`${base}/realms/${loginRealm}/protocol/openid-connect/token`, {method: 'POST', headers, body});
		const res = await this.fetchCall(req, loginRealm, msg);
		return (await handleZodResponse(tokenResponseSchema, res, msg)).unwrap();
	}

	/**
	 * return API credentials from URL
	 */
	private async getCredentials(): Promise<ApiCredentials> {
		if (!this.credentials) {
			const url = await resolveLoadable(this.url);
			try {
				this.credentials = this.parseCredentials(url);
			} catch (e) {
				throw new TypeError(`Invalid KeyCloak url: ${url.hash} (${errorString(e)})`);
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
		let loginRealm = 'master';
		// split and filter empty strings
		const path = url.pathname.split('/').filter((p) => p !== '');
		if (path.length > 2) {
			throw new TypeError('URL path length > 2');
		}
		if (path.length === 1) {
			// loginRealm is first on path
			loginRealm = path[0];
		} else if (path.length === 2 && path[0] === 'realms') {
			// if url is with realms base path, then loginRealm is second on path
			loginRealm = path[1];
		}
		return {base, loginRealm, password: url.password, username: url.username};
	}

	private async fetchCall(req: Request, realm: string, message: string): Promise<IResult<Response, FetchError | HttpResponseError>> {
		return handleRequest(this.fetchClient, req, message, realm, this.logger);
	}
}
