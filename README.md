# keycloak-management-client

## Keycloak Management API Client

This is a client for the Keycloak Management API. It is written in TypeScript and can be used in TypeScript or JavaScript projects.
Currently, it supports the following operations:

- Groups - Create (and create child), Get, Query, Get Count, Delete.
- Users - Create, Update, Query, Get, Delete.
- Roles - Create, Get, Query, Delete.

KeycloakManagement should work with Node.js and in the browser as long as you provide a way to get the access token via callback and for browser to have CORS rules set up correctly (if not on same origin).

### Installation

```bash
npm install keycloak-management-client
```

### Usage

```typescript
import {CliAuth, KeyCloakManagement} from 'keycloak-management-client';
const kcUrl = 'http://admin:admin@localhost:8080';
const authClient = new CliAuth(kcUrl);
const kc = new KeyCloakManagement(kcUrl, auth.getAccessToken);
(await kc.createUser({username: 'test-user'} /* ,'realm' */)).unwrap();
const res: GetUser[] = (await kc.queryUser({username: 'test-user'} /* ,'realm' */)).unwrap();
```

### Development - online unit testing

```bash
docker run -p 8080:8080 -d --name=keycloak  -e KEYCLOAK_FRONTEND_URL=http://localhost:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:22.0.3 start-dev
```

add to .env file

```ini
KEYCLOAK_URL=http://admin:admin@localhost:8080
```
