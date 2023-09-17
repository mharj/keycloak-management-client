import * as dotEnv from 'dotenv';
import {FetchSnapshotStore} from './lib/fetchStore';
import {TokenValidationCallback} from '../src';

dotEnv.config();

export const isOnline = !!process.env.KEYCLOAK_URL; // if KEYCLOAK_URL is set, we are using online KeyCloak

export const kcUrl = new URL(process.env.KEYCLOAK_URL || 'http://admin:admin@localhost:8080');

export const tokenValidation: TokenValidationCallback | undefined = isOnline ? undefined : () => true;

/**
 * if online, we clear old store before store initialization.
 */
export async function prepareSnapshotStore(store: FetchSnapshotStore) {
	// we will write, clear old store for snapshot update
	isOnline && (await store.deleteStore());
	// initialize store
	await store.init();
}
