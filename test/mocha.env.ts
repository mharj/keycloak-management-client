/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-namespace */

// setup mocha env vars
process.env.NODE_ENV = 'test';

// setup namespace for mocha env vars
declare namespace NodeJS {
	export interface ProcessEnv {
		NODE_ENV: 'test' | string;
		KEYCLOAK_URL: string | undefined;
	}
}
