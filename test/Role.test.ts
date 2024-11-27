import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {getPassedStatus, isOnline, kcUrl, prepareSnapshotStore, tokenValidation} from './common';
import {CliAuth, type GetRole, KeyCloakManagement, type Role} from '../src';
import {FetchSnapshotStore} from './lib/fetchStore';

const store = new FetchSnapshotStore('./test/data/roleFetchSnapshot.json.gz'); // req & res fetch snapshot store for offline unit testing
// setup fetch proxy read or write operation depending on isOnline flag
const fetchClient = store.buildFetchProxy(isOnline);

/**
 * unit test for KeyCloakManagement
 */
let kc: KeyCloakManagement;

describe(`Role [${isOnline ? 'online' : 'offline'}] test`, function () {
	beforeAll(async function () {
		await prepareSnapshotStore(store);
		// create KeyCloakManagement instance with custom fetchClient and tokenValidation depending on online/offline mode (offline mode will not check token expiration)
		const auth = new CliAuth(kcUrl, {fetchClient, tokenValidation});
		await auth.login(); // do pre-login to get token
		kc = new KeyCloakManagement(kcUrl, auth.getAccessToken, {fetchClient});
	});
	describe('roles', function () {
		it('should get list of roles', async function () {
			const _payload: Role[] = (await kc.queryRoles()).unwrap();
			expect(_payload).to.be.an('array');
		});
		it('should create new role', async function () {
			const _callRetType: void = (await kc.createRole({name: 'UnitTestRole', description: 'Unit test role'})).unwrap();
		});
		it('should get role', async function () {
			const payload: GetRole = (await kc.getRole('UnitTestRole')).unwrap();
			expect(payload).to.containSubset({name: 'UnitTestRole', description: 'Unit test role'});
		});
		it('should delete role', async function () {
			const _callRetType: void = (await kc.deleteRole('UnitTestRole')).unwrap();
		});
	});
	afterAll(async function ({tasks}) {
		if (isOnline && getPassedStatus(tasks)) {
			await store.saveStore();
		}
	});
});
