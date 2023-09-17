# keycloak-management-client

### online unit testing

```bash
docker run -p 8080:8080 -d --name=keycloak  -e KEYCLOAK_FRONTEND_URL=http://localhost:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:22.0.3 start-dev
```

add to .env file

```ini
KEYCLOAK_URL=http://admin:admin@localhost:8080
```
