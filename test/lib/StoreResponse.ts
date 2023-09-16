type StoreResponseInit = ResponseInit & {url: string; type: ResponseType};

function getResponseInit(init: StoreResponseInit | undefined): ResponseInit | undefined {
	if (!init) {
		return init;
	}
	const {headers, status, statusText} = init;
	return {headers, status, statusText};
}

export class StoreResponse extends Response {
	public readonly _url: string;
	public readonly _type: ResponseType;
	constructor(body: BodyInit | null | undefined, init: StoreResponseInit) {
		super(body, getResponseInit(init));
		this._url = init.url;
		this._type = init.type;
	}

	public get url(): string {
		return this._url;
	}

	public get type(): ResponseType {
		return this._type;
	}
}
