/* eslint-disable no-unused-expressions */
import 'mocha';
import * as chai from 'chai';
import * as chaiSubset from 'chai-subset';
import {isOnline, kcUrl, prepareSnapshotStore, tokenValidation} from './common';
import {FetchSnapshotStore} from './lib/fetchStore';
import {CliAuth, KeyCloakManagement} from '../src';
import {GroupCount} from '../src/types/group/GroupCount';

chai.use(chaiSubset);

const expect = chai.expect;

const store = new FetchSnapshotStore('./test/data/groupFetchSnapshot.json.gz'); // req & res fetch snapshot store for offline unit testing
// setup fetch proxy read or write operation depending on isOnline flag
const fetchClient = store.buildFetchProxy(isOnline);

/**
 * unit test for KeyCloakManagement
 */
let kc: KeyCloakManagement;

describe(`Group [${isOnline ? 'online' : 'offline'}] test`, function () {
	before(async function () {
		await prepareSnapshotStore(store);
		// create KeyCloakManagement instance with custom fetchClient and tokenValidation depending on online/offline mode (offline mode will not check token expiration)
		const auth = new CliAuth(kcUrl, {fetchClient, tokenValidation});
		await auth.login(); // do pre-login to get token
		kc = new KeyCloakManagement(kcUrl, auth.getAccessToken, {fetchClient});
	});

	it('should get group count', async function () {
		const _payload: GroupCount = (await kc.getGroupCount()).unwrap();
	});
});
