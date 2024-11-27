import {existsSync} from 'fs';
import {type ILoggerLike} from '@avanio/logger-like';
import {type IPersistSerializer, type IStorageDriver} from 'tachyon-drive';
import {FileStorageDriver} from 'tachyon-drive-node-fs';
import {z} from 'zod';
import {type JsonRequest} from './JsonRequest';
import {jsonRequestResponseSchema} from './JsonRequestResponse';
import {type JsonResponse} from './JsonResponse';
import {StoreResponse} from './StoreResponse';
import {zipProcessor} from './zipProcessor';

const cacheDataSchema = z.map(z.string(), jsonRequestResponseSchema);

type CacheData = z.infer<typeof cacheDataSchema>;

const bufferSerializer: IPersistSerializer<CacheData, Buffer> = {
	name: 'bufferSerializer',
	serialize: (data: CacheData) => Buffer.from(JSON.stringify(Array.from(data))),
	deserialize: (buffer: Buffer) => new Map(JSON.parse(buffer.toString())),
	validator: (data: CacheData) => cacheDataSchema.safeParse(data).success, // optional deserialization validation
};

export type FetchStoreKeyBuilder = (req: Request, index: number) => string;

const defaultKeyBuilder: FetchStoreKeyBuilder = (req: Request, index: number) => `${req.method}:${req.url}:${index}`;

export class FetchSnapshotStore {
	private driver: IStorageDriver<CacheData>;
	private cache: CacheData = new Map();
	private keyBuilder: FetchStoreKeyBuilder;
	private fileName: string;
	private logger?: ILoggerLike;
	private writeIndex = 0;
	private readIndex = 0;
	constructor(fileName: string, keyBuilder: FetchStoreKeyBuilder = defaultKeyBuilder, logger?: ILoggerLike) {
		this.driver = new FileStorageDriver('FileStorageDriver', {fileName}, bufferSerializer, zipProcessor, logger);
		this.driver.init();
		this.keyBuilder = keyBuilder;
		this.fileName = fileName;
		this.logger = logger;
		this.fetch = this.fetch.bind(this);
		this.proxyFetch = this.proxyFetch.bind(this);
	}

	public async init(): Promise<void> {
		this.driver.init();
		const data = await this.driver.hydrate();
		if (data) {
			this.logger?.info(`Hydrated ${data.size} entries from ${this.fileName}`);
			data.forEach((value, key) => {
				this.logger?.debug(`Hydrated key: ${key}`);
			});
			this.cache = data;
		}
	}

	public async saveStore(): Promise<void> {
		return this.driver.store(this.cache);
	}

	public async store(req: Request, res: Response): Promise<void> {
		const key = this.keyBuilder(req.clone(), this.writeIndex);
		this.writeIndex++;
		this.cache.set(key, {req: await this.exportRequest(req), res: await this.exportResponse(res)});
	}

	public async deleteStore(): Promise<void> {
		if (existsSync(this.fileName)) {
			this.logger?.info(`Deleting store file: ${this.fileName}`);
			await this.driver.clear();
		}
	}

	/**
	 * build fetch proxy depending on online/offline mode
	 * - online: use fetch and store req and res to JSON
	 * - offline: fetch call will get responses from internal store
	 */
	public buildFetchProxy(isOnline: boolean): typeof fetch {
		if (isOnline) {
			this.logger?.info('Online: Using fetch and store to JSON');
			return this.proxyFetch;
		}
		this.logger?.info('Offline: Using JSON files as proxy');
		return this.fetch;
	}

	/**
	 * this is fetch function which can be used as fetchClient in KeyCloakManagement for unit testing
	 */
	public async fetch(input: RequestInfo | URL, init?: RequestInit | undefined): Promise<Response> {
		const req = new Request(input, init);
		const key = this.keyBuilder(req, this.readIndex);
		this.assertRequest(req);
		this.readIndex++;
		const cached = this.cache.get(key);
		if (cached?.res) {
			this.logger?.debug(`JSON Read: ${key} found`);
			return this.importResponse(cached.res);
		}
		this.logger?.debug(`JSON Read: ${key} not-found`);
		return new Response(null, {status: 404, statusText: 'Not Found'});
	}

	private assertRequest(req: Request): void {
		const url = new URL(req.url);
		if (!url.protocol.startsWith('http')) {
			throw new Error('fetch failed');
		}
	}

	/**
	 * fetch request and store the request and result to JSON
	 */
	private async proxyFetch(input: RequestInfo | URL, init?: RequestInit | undefined): Promise<Response> {
		const req = new Request(input, init);
		const res = await fetch(req.clone());
		const key = this.keyBuilder(req, this.writeIndex);
		this.logger?.debug(`JSON Write: ${key}`);
		await this.store(req.clone(), res.clone());
		return res;
	}

	public get(req: Request): Response | undefined {
		const key = this.keyBuilder(req, this.readIndex);
		const cached = this.cache.get(key);
		if (!cached || !cached.res) {
			return undefined;
		}
		return this.importResponse(cached.res);
	}

	public getRequest(input: RequestInfo | URL, init?: RequestInit | undefined): Request | undefined {
		const req = new Request(input, init);
		const key = this.keyBuilder(req, this.readIndex);
		const cached = this.cache.get(key);
		if (!cached) {
			return undefined;
		}
		return this.importRequest(cached.req);
	}

	/**
	 * Convert headers to Record<string, string>
	 */
	private convertHeaders(headers: Headers): Record<string, string> {
		const result: Record<string, string> = {};
		const headerArray = Array.from(headers.entries()).filter(([key]) => key !== 'authorization'); // no need to store authorization header
		for (const [key, value] of headerArray) {
			result[key] = value;
		}
		return result;
	}

	/**
	 * convert body ArrayBuffer to base64 string
	 */
	private async exportResBody(res: Response): Promise<string | null> {
		if (res.body === null) {
			return null;
		}
		if (res.bodyUsed) {
			throw new Error('Unable to export body, body already used');
		}
		return Buffer.from(await res.arrayBuffer()).toString('base64');
	}

	private async exportReqBody(req: Request): Promise<string | null> {
		if (req.body === null) {
			return null;
		}
		if (req.bodyUsed) {
			throw new Error('Unable to export body, body already used');
		}
		return Buffer.from(await req.arrayBuffer()).toString('base64');
	}

	/**
	 * convert base64 string to ArrayBuffer
	 */
	private importBody(body: string | null): ArrayBuffer | null {
		if (body === null) {
			return null;
		}
		return Buffer.from(body, 'base64');
	}

	/**
	 *
	 */
	private async exportResponse(res: Response): Promise<JsonResponse> {
		return {
			body: await this.exportResBody(res.clone()),
			headers: this.convertHeaders(res.headers),
			status: res.status,
			statusText: res.statusText,
			type: res.type,
			url: res.url,
		};
	}

	private importResponse(data: JsonResponse): Response {
		return new StoreResponse(this.importBody(data.body), {
			headers: new Headers(data.headers),
			status: data.status,
			statusText: data.statusText,
			type: data.type,
			url: data.url,
		});
	}

	private async exportRequest(req: Request): Promise<JsonRequest> {
		return {
			body: await this.exportReqBody(req.clone()),
			headers: this.convertHeaders(req.headers),
			method: req.method,
			url: req.url,
		};
	}

	private importRequest(data: JsonRequest): Request {
		return new Request(data.url, {
			body: this.importBody(data.body),
			headers: new Headers(data.headers),
			method: data.method,
		});
	}
}
