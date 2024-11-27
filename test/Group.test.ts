import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {getPassedStatus, isOnline, kcUrl, prepareSnapshotStore, tokenValidation} from './common';
import {CliAuth, KeyCloakManagement} from '../src';
import {FetchSnapshotStore} from './lib/fetchStore';
import {createChildGroupResponseSchema, type CreateChildGroupResponse} from '../src/types/group/CreateGroup';
import {groupSchema} from '../src/types/group/Group';
import {groupCountSchema, type GroupCount} from '../src/types/group/GroupCount';

const store = new FetchSnapshotStore('./test/data/groupFetchSnapshot.json.gz'); // req & res fetch snapshot store for offline unit testing
// setup fetch proxy read or write operation depending on isOnline flag
const fetchClient = store.buildFetchProxy(isOnline);

/**
 * unit test for KeyCloakManagement
 */
let kc: KeyCloakManagement;

describe(`Group [${isOnline ? 'online' : 'offline'}] test`, function () {
	beforeAll(async function () {
		await prepareSnapshotStore(store);
		// create KeyCloakManagement instance with custom fetchClient and tokenValidation depending on online/offline mode (offline mode will not check token expiration)
		const auth = new CliAuth(kcUrl, {fetchClient, tokenValidation});
		await auth.login(); // do pre-login to get token
		kc = new KeyCloakManagement(kcUrl, auth.getAccessToken, {fetchClient});
	});

	it('should get group count', async function () {
		const payload: GroupCount = (await kc.getGroupCount()).unwrap();
		expect(groupCountSchema.strict().safeParse(payload).success).to.be.equal(true);
	});
	it('should create UnitTest01 and UnitTest02 groups', async function () {
		const _payload1: void = (await kc.createGroup({name: 'UnitTest01'})).unwrap();
		const _payload2: void = (await kc.createGroup({name: 'UnitTest02'})).unwrap();
		const groupId = (await kc.queryGroups({search: 'UnitTest02', exact: true})).unwrap()?.[0].id;
		if (!groupId) {
			throw new Error('UnitTest02 group not found');
		}
		const payload3: CreateChildGroupResponse = (await kc.createChildGroup(groupId, {name: 'UnitTest03', path: '/UnitTest02'})).unwrap();
		expect(createChildGroupResponseSchema.strict().safeParse(payload3).success).to.be.equal(true);
	});
	it('should get query groups', async function () {
		const query = (await kc.queryGroups({search: 'UnitTest'})).unwrap();
		expect(groupSchema.strict().array().safeParse(query).success).to.be.equal(true);
		expect(query.length).to.be.equal(2);
		expect((await kc.queryGroups({search: 'UnitTest', exact: true})).unwrap().length).to.be.equal(0);
		expect((await kc.queryGroups({search: 'UnitTest01', exact: true})).unwrap().length).to.be.equal(1);
		expect((await kc.queryGroups({search: 'UnitTest02', exact: true})).unwrap().length).to.be.equal(1);
	});
	it('should delete UnitTest03 group', async function (ctx) {
		const groupId = (await kc.queryGroups({search: 'UnitTest03', exact: true})).unwrap()?.[0].subGroups?.[0].id;
		if (!groupId) {
			return ctx.skip();
		}
		const _payload: void = (await kc.deleteGroup(groupId)).unwrap();
	});
	it('should delete UnitTest01 group', async function (ctx) {
		const groupId = (await kc.queryGroups({search: 'UnitTest01', exact: true})).unwrap()?.[0].id;
		if (!groupId) {
			return ctx.skip();
		}
		const _payload: void = (await kc.deleteGroup(groupId)).unwrap();
	});

	it('should delete UnitTest02 group', async function (ctx) {
		const groupId = (await kc.queryGroups({search: 'UnitTest02', exact: true})).unwrap()?.[0].id;
		if (!groupId) {
			return ctx.skip();
		}
		const _payload: void = (await kc.deleteGroup(groupId)).unwrap();
	});
	afterAll(async function ({tasks}) {
		if (isOnline && getPassedStatus(tasks)) {
			await store.saveStore();
		}
	});
});
