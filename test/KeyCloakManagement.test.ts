/* eslint-disable no-unused-expressions */
import 'mocha';
import * as chai from 'chai';
import * as dotEnv from 'dotenv';
import {FetchSnapshotStore} from './lib/fetchStore';
import {assertGetUserArrayResponse, assertGetUserResponse, CreateUserRequest, KeyCloakManagement} from '../src/';

const expect = chai.expect;
dotEnv.config();

const isOnline = !!process.env.KEYCLOAK_URL; // if KEYCLOAK_URL is set, we are using online KeyCloak
const store = new FetchSnapshotStore('./test/data/fetchSnapshotStore.json.gz'); // req & res fetch snapshot store for offline unit testing

/**
 * unit test for KeyCloakManagement
 */
let kc: KeyCloakManagement;
let currentUserRequest: CreateUserRequest;
let testUserId: string | undefined;

/**
 * test01 user data
 */
const test01UserData = {
	username: 'test01',
	credentials: [{type: 'password', value: 'demo1password2', temporary: false}],
} satisfies CreateUserRequest;

const test02UserData = {
	username: 'test02',
	email: 'unit@test.to',
} satisfies CreateUserRequest;

/**
 * check demoUserId is defined (type guard), otherwise skip test
 */
function assertUserId(ctx: Mocha.Context, userId: string | undefined): asserts userId is string {
	if (!userId) {
		ctx.skip();
	}
}

describe(`KeyCloakManagement [${isOnline ? 'online' : 'offline'}] test`, function () {
	before(async function () {
		const url = new URL(process.env.KEYCLOAK_URL || 'http://admin:admin@localhost:8080');
		if (isOnline) {
			// we will write, clear old store for full update
			store.deleteStore();
		}
		// setup fetch proxy read or write operation depending on useJsonProxy
		const fetchClient = store.buildFetchProxy(isOnline);
		// initialize store
		await store.init();
		// create KeyCloakManagement instance with custom fetchClient and tokenValidation depending on online/offline mode (offline mode will not check token expiration)
		kc = new KeyCloakManagement(url, {fetchClient}, isOnline ? undefined : () => true);
	});
	it('should check test is ok (auth)', async function () {
		await kc.test();
	});
	describe('test01 user', function () {
		before(function () {
			testUserId = undefined;
			currentUserRequest = test01UserData;
		});
		it(`should create user`, async function () {
			expect(testUserId).to.be.undefined;
			await kc.createUser(currentUserRequest);
		});
		it(`should query user`, async function () {
			expect(testUserId).to.be.undefined;
			const res = await kc.queryUser({username: currentUserRequest.username});
			expect(res.length).to.equal(1);
			assertGetUserArrayResponse(res, true);
			testUserId = res[0].id;
		});
		it(`should get user with id`, async function () {
			assertUserId(this, testUserId);
			const user = await kc.getUser(testUserId);
			expect(user).to.be.an('object', 'user not found');
			assertGetUserResponse(user, true);
			expect(user.username).to.equal(currentUserRequest.username);
		});
		it(`should update user`, async function () {
			assertUserId(this, testUserId);
			await kc.updateUser(testUserId, {firstName: 'Demo', lastName: 'User'});
			const user = await kc.getUser(testUserId);
			assertGetUserResponse(user, true);
			expect(user.firstName).to.equal('Demo');
			expect(user.lastName).to.equal('User');
		});
		it(`should delete user`, async function () {
			assertUserId(this, testUserId);
			await kc.deleteUser(testUserId);
		});
	});
	describe('test02 user', function () {
		before(function () {
			testUserId = undefined;
			currentUserRequest = test02UserData;
		});
		it(`should create user`, async function () {
			expect(testUserId).to.be.undefined;
			await kc.createUser(currentUserRequest);
		});
		it(`should query user`, async function () {
			expect(testUserId).to.be.undefined;
			const res = await kc.queryUser({username: currentUserRequest.username});
			expect(res.length).to.equal(1);
			assertGetUserArrayResponse(res, true);
			testUserId = res[0].id;
		});
		it(`should get user with id`, async function () {
			assertUserId(this, testUserId);
			const user = await kc.getUser(testUserId);
			expect(user).to.be.an('object', 'user not found');
			assertGetUserResponse(user, true);
			expect(user.username).to.equal(currentUserRequest.username);
		});
		it(`should update user`, async function () {
			assertUserId(this, testUserId);
			await kc.updateUser(testUserId, {firstName: 'Demo', lastName: 'User'});
			const user = await kc.getUser(testUserId);
			assertGetUserResponse(user, true);
			expect(user.firstName).to.equal('Demo');
			expect(user.lastName).to.equal('User');
		});
		it(`should delete user`, async function () {
			assertUserId(this, testUserId);
			await kc.deleteUser(testUserId);
		});
	});
	after(async function () {
		if (kc) {
			const userNames = [test01UserData.username, test02UserData.username];
			for (const username of userNames) {
				const res = await kc.queryUser({username});
				if (res.length === 1) {
					await kc.deleteUser(res[0].id);
				}
			}
		}
	});
});
