# Security and deployment notes

## What changed

- The dashboard files are now served by `API.frontend:app`, which validates the server-side session before returning any `/dashboard/*` file.
- API requests require a valid active session. Bearer access tokens and the existing HttpOnly session cookie are both supported.
- Personal-message sends and chat-service/webhook requests are checked server-side against per-user permissions.
- Chat UI requests now go through the authenticated API gateway rather than calling the chat service ports directly from the browser.
- Database credentials are read from environment variables; no database password is embedded in `API/database.py`.
- Runtime cookies, browser state, and the local state database are excluded from builds and ignored by Git. Their current copies were removed from the main branch, but may remain in Git history.

## Before deployment

1. Back up the database and the current container configuration.
2. Copy `deployment.env.example` to `.env` on the server. Put the **current, working database password** in `DB_PASSWORD`; never commit `.env`.
3. Keep `COOKIE_SECURE=false` only while users access the site over plain HTTP. Set it to `true` after HTTPS is configured end-to-end for the browser/API path.
4. Confirm the existing external Docker network `internal_net` and volume `eitaa-media-shared` exist before using the Compose file.
5. Build first, before replacing the running container:

   ```bash
   docker compose config
   docker compose build bale_sender
   ```

6. Schedule the container replacement during a maintenance window. A single container on fixed ports cannot be replaced with guaranteed zero downtime. The current Compose file keeps the existing container name, ports, external network, external media volume, and `restart: no` behavior.
7. After the new container is running and the DB connection works, seed the permission catalog:

   ```bash
   docker exec -it bale_sender python -m API.migrations.seed_permissions
   ```

   The seeder checks the live table schema and aborts instead of guessing values for unknown required columns. If it aborts, inspect the exact `permissions` table schema and add an explicit mapping before retrying.

## Chat-service network boundary

The gateway checks permissions, but the Bale and Eitaa chat services are separate from this repository. To prevent bypassing the gateway, move those services onto a private Docker network and set `BALE_CHAT_SERVICE_URL` and `EITAA_CHAT_SERVICE_URL` to their internal service DNS names. Only then close public access to ports 3000 and 3001. Do not block those ports before updating the upstream URLs, or the chat proxy may stop working.

## Session exposure

Removing `cookies.txt` and browser-profile files from the current branch does not erase earlier Git history. Treat any session material previously committed as exposed and revoke the affected session(s). Do not invalidate all user sessions during normal business hours unless a coordinated logout is acceptable.

## Validation

The GitHub Actions workflow `.github/workflows/validate.yml` compiles Python source and checks JavaScript syntax on pushes and pull requests. Passing syntax checks does not replace testing login/OTP, session expiry, permission denial, chat reads/writes, and message sending against the actual deployment.
