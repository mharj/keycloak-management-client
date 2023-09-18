/* eslint-disable no-unused-expressions */
import 'mocha';
import * as chai from 'chai';
import {isOnline, kcUrl, prepareSnapshotStore, tokenValidation} from './common';
import {FetchSnapshotStore} from './lib/fetchStore';
import {WatchTestStatus} from './lib/mochaUtils';
import {CliAuth, CreateUser, GetUser, KeyCloakManagement} from '../src';

const expect = chai.expect;

const store = new FetchSnapshotStore('./test/data/userFetchSnapshot.json.gz'); // req & res fetch snapshot store for offline unit testing
// setup fetch proxy read or write operation depending on isOnline flag
const fetchClient = store.buildFetchProxy(isOnline);

const watchTestStatus = new WatchTestStatus();

/**
 * unit test for KeyCloakManagement
 */
let kc: KeyCloakManagement;
let currentUserRequest: CreateUser;
let testUserId: string | undefined;

/**
 * test01 user data
 */
const test01UserData = {
	username: 'test01',
	credentials: [{type: 'password', value: 'demo1password2', temporary: false}],
} satisfies CreateUser;

const test02UserData = {
	username: 'test02',
	email: 'unit@test.to',
} satisfies CreateUser;

/**
 * check demoUserId is defined (type guard), otherwise skip test
 */
function assertUserId(ctx: Mocha.Context, userId: string | undefined): asserts userId is string {
	if (!userId) {
		ctx.skip();
	}
}

describe(`User [${isOnline ? 'online' : 'offline'}] test`, function () {
	afterEach(function () {
		watchTestStatus.check(this);
	});
	before(async function () {
		watchTestStatus.start();
		await prepareSnapshotStore(store);
		// create KeyCloakManagement instance with custom fetchClient and tokenValidation depending on online/offline mode (offline mode will not check token expiration)
		const auth = new CliAuth(kcUrl, {fetchClient, tokenValidation});
		await auth.login(); // do pre-login to get token
		kc = new KeyCloakManagement(kcUrl, auth.getAccessToken, {fetchClient});
	});
	describe('test01 user', function () {
		before(function () {
			testUserId = undefined;
			currentUserRequest = test01UserData;
		});
		it(`should create user`, async function () {
			expect(testUserId).to.be.undefined;
			const _callRetType: void = (await kc.createUser(currentUserRequest)).unwrap();
		});
		it(`should query user`, async function () {
			expect(testUserId).to.be.undefined;
			const res: GetUser[] = (await kc.queryUser({username: currentUserRequest.username})).unwrap();
			expect(res.length).to.equal(1);
			testUserId = res[0].id;
		});
		it(`should get user with id`, async function () {
			assertUserId(this, testUserId);
			const user: GetUser | undefined = (await kc.getUser(testUserId)).unwrap();
			expect(user?.username).to.equal(currentUserRequest.username);
		});
		it(`should update user`, async function () {
			assertUserId(this, testUserId);
			const _callRetType: void = (await kc.updateUser(testUserId, {firstName: 'Demo', lastName: 'User'})).unwrap();
			const user: GetUser | undefined = (await kc.getUser(testUserId)).unwrap();
			expect(user?.firstName).to.equal('Demo');
			expect(user?.lastName).to.equal('User');
		});
		it(`should delete user`, async function () {
			assertUserId(this, testUserId);
			const _callRetType: void = (await kc.deleteUser(testUserId)).unwrap();
		});
	});
	describe('test02 user', function () {
		before(function () {
			testUserId = undefined;
			currentUserRequest = test02UserData;
		});
		it(`should create user`, async function () {
			expect(testUserId).to.be.undefined;
			const _callRetType: void = (await kc.createUser(currentUserRequest)).unwrap();
		});
		it(`should query user`, async function () {
			expect(testUserId).to.be.undefined;
			const res: GetUser[] = (await kc.queryUser({username: currentUserRequest.username})).unwrap();
			expect(res.length).to.equal(1);
			testUserId = res[0].id;
		});
		it(`should get user with id`, async function () {
			assertUserId(this, testUserId);
			const user: GetUser | undefined = (await kc.getUser(testUserId)).unwrap();
			expect(user?.username).to.equal(currentUserRequest.username);
		});
		it(`should update user`, async function () {
			assertUserId(this, testUserId);
			const _callRetType: void = (await kc.updateUser(testUserId, {firstName: 'Demo', lastName: 'User'})).unwrap();
			const user: GetUser | undefined = (await kc.getUser(testUserId)).unwrap();
			expect(user?.firstName).to.equal('Demo');
			expect(user?.lastName).to.equal('User');
		});
		it(`should delete user`, async function () {
			assertUserId(this, testUserId);
			const _callRetType: void = (await kc.deleteUser(testUserId)).unwrap();
		});
	});
	after(async function () {
		if (kc) {
			const userNames = [test01UserData.username, test02UserData.username];
			for (const username of userNames) {
				const res = (await kc.queryUser({username})).unwrap();
				if (res.length === 1) {
					await kc.deleteUser(res[0].id);
				}
			}
		}
		if (isOnline && watchTestStatus.getState()) {
			await store.saveStore();
		}
	});
});
