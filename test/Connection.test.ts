/* eslint-disable no-unused-expressions */
import 'mocha';
import * as chai from 'chai';
import {isOnline, kcUrl, prepareSnapshotStore, tokenValidation} from './common';
import {FetchSnapshotStore} from './lib/fetchStore';
import {CliAuth, KeyCloakManagement} from '../src/';
import {FetchError} from '../src/FetchError';
import {HttpResponseError} from '../src/HttpResponseError';

const expect = chai.expect;

const store = new FetchSnapshotStore('./test/data/loginFetchSnapshot.json.gz'); // req & res fetch snapshot store for offline unit testing
// setup fetch proxy read or write operation depending on isOnline flag
const fetchClient = store.buildFetchProxy(isOnline);

describe(`Connection [${isOnline ? 'online' : 'offline'}] test`, function () {
	before(async function () {
		await prepareSnapshotStore(store);
	});
	it('should fail on broken fetch call', async function () {
		const auth = new CliAuth(kcUrl, {fetchClient, tokenValidation});
		try {
			await auth.login();
		} catch (e) {
			expect(e).to.be.instanceOf(FetchError);
			expect(e).to.have.property('message', 'Unable to get access token in realm master: fetch failed');
		}
	});
	it('should fail fetch call to non-valid path', async function () {
		const notFoundRealm = '__broken_realm__';
		const urlInstance = new URL(kcUrl); // clone url
		urlInstance.pathname = `/${notFoundRealm}`; // this realm does not exist
		const auth = new CliAuth(kcUrl, {fetchClient, tokenValidation});
		try {
			await auth.login();
		} catch (e) {
			expect(e).to.be.instanceOf(HttpResponseError);
			expect(e).to.have.property('status', 404);
			expect(e).to.have.property('message', `Unable to get access token in realm ${notFoundRealm}`);
			expect(e).to.have.property('url', `${urlInstance.protocol}//${urlInstance.host}/realms${urlInstance.pathname}/protocol/openid-connect/token`);
		}
	});
	it('should connect to KC instance', async function () {
		const auth = new CliAuth(kcUrl, {fetchClient, tokenValidation});
		await auth.login();
		const kc = new KeyCloakManagement(kcUrl, auth.getAccessToken, {fetchClient});
		(await kc.getGroupCount()).unwrap();
	});
	this.afterAll(async function () {
		if (isOnline && this.currentTest?.state === 'passed') {
			await store.saveStore();
		}
	});
});
