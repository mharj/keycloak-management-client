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
	it('should create UnitTest01 and UnitTest02 groups', async function () {
		const _payload1: void = (await kc.createGroup({name: 'UnitTest01'})).unwrap();
		const _payload2: void = (await kc.createGroup({name: 'UnitTest02'})).unwrap();
		const groupId = (await kc.queryGroups({search: 'UnitTest02', exact: true})).unwrap()?.[0].id;
		if (!groupId) {
			throw new Error('UnitTest02 group not found');
		}
		const _payload3: void = (await kc.createChildGroup(groupId, {name: 'UnitTest03', path: '/UnitTest02'})).unwrap();
	});
	it('should get query groups', async function () {
		expect((await kc.queryGroups({search: 'UnitTest'})).unwrap().length).to.be.equal(2);
		expect((await kc.queryGroups({search: 'UnitTest', exact: true})).unwrap().length).to.be.equal(0);
		expect((await kc.queryGroups({search: 'UnitTest01', exact: true})).unwrap().length).to.be.equal(1);
		expect((await kc.queryGroups({search: 'UnitTest02', exact: true})).unwrap().length).to.be.equal(1);
	});
	it('should delete UnitTest03 group', async function () {
		const groupId = (await kc.queryGroups({search: 'UnitTest03', exact: true})).unwrap()?.[0].subGroups?.[0].id;
		if (!groupId) {
			this.skip();
		}
		const _payload: void = (await kc.deleteGroup(groupId)).unwrap();
	});
	it('should delete UnitTest01 group', async function () {
		const groupId = (await kc.queryGroups({search: 'UnitTest01', exact: true})).unwrap()?.[0].id;
		if (!groupId) {
			this.skip();
		}
		const _payload: void = (await kc.deleteGroup(groupId)).unwrap();
	});

	it('should delete UnitTest02 group', async function () {
		const groupId = (await kc.queryGroups({search: 'UnitTest02', exact: true})).unwrap()?.[0].id;
		if (!groupId) {
			this.skip();
		}
		const _payload: void = (await kc.deleteGroup(groupId)).unwrap();
	});
	after(async function () {
		if (isOnline && this.currentTest?.state === 'passed') {
			await store.saveStore();
		}
	});
});
