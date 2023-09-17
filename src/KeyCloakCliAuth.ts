import {ILoggerLike} from '@avanio/logger-like';
import {TokenValidationCallback, defaultTokenValidation} from './lib/authUtils';
import {errorString} from './lib/errorUtils';
import {handleJsonRequest} from './lib/httpUtils';
import {testAssertSchema} from './lib/zodUtils';
import {TokenResponse, tokenResponseSchema} from './types/auth/TokenResponse';
import {Loadable} from './types/Loadable';

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
		const {base, loginRealm, username, password} = await this.getCredentials();
		const headers = new Headers({'Content-Type': 'application/x-www-form-urlencoded'});
		const body = new URLSearchParams();
		body.append('client_id', 'admin-cli');
		body.append('grant_type', 'password');
		body.append('username', username);
		body.append('password', password);
		const req = new Request(`${base}/realms/${loginRealm}/protocol/openid-connect/token`, {method: 'POST', headers, body});
		const result = await handleJsonRequest(this.fetchClient, req, 'get access token', loginRealm, this.logger);
		testAssertSchema(tokenResponseSchema, result);
		return result.unwrap();
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
}
