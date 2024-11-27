import * as dotEnv from 'dotenv';
import {type RunnerTask} from 'vitest';
import {type TokenValidationCallback} from '../src';
import {type FetchSnapshotStore} from './lib/fetchStore';

dotEnv.config();

export const isOnline = !!process.env.KEYCLOAK_URL; // if KEYCLOAK_URL is set, we are using online KeyCloak

export const kcUrl = new URL(process.env.KEYCLOAK_URL || 'http://admin:admin@localhost:8080');

export const tokenValidation: TokenValidationCallback | undefined = isOnline ? undefined : () => true;

/**
 * if online, we clear old store before store initialization.
 */
export async function prepareSnapshotStore(store: FetchSnapshotStore) {
	// we will write, clear old store for snapshot update
	if (isOnline) {
		await store.deleteStore();
	}
	// initialize store
	await store.init();
}

export function getPassedStatus(tasks: RunnerTask[]) {
	return tasks.every((task) => {
		const state = task.result?.state;
		return state === 'pass' || state === 'skip';
	});
}
