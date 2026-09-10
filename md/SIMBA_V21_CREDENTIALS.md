# SIMBA V21 — Credential inventory + decisions (W6 P22)

The 10 remote-data adapters in `src/infrastructure/api/<provider>/` need credentials of varying sensitivity. This document records the per-provider inventory + the architectural decision for each.

Closes defect **D-024** partly (the credential-handling aspect; the schema-validation aspect closes in W6 P24 + P21c).

## 1. Inventory

| Provider | Credentials | Sensitivity | Where stored today |
|----------|-------------|-------------|--------------------|
| **Podcast Index** | `PODCAST_INDEX_API_KEY` + `PODCAST_INDEX_API_SECRET` | **HIGH** — HMAC secret. Anyone with these can submit new podcast feeds to the public Podcast Index directory. | `android/.env` (gitignored) via `react-native-config` → `ENV.PODCAST_INDEX_API_KEY` / `SECRET`. Read at adapter call time (`sha1(key + secret + timestamp)`). |
| **Jamendo** | `JAMENDO_CLIENT_ID` + `JAMENDO_CLIENT_SECRET` | LOW — public OAuth client_id. App-only key; rate-limited per IP. | `android/.env` → `ENV.JAMENDO_CLIENT_ID` / `SECRET`. |
| **Audius** | `AUDIUS_API_KEY` | LOW — discovery-node read key. App-only. | `android/.env` → `ENV.AUDIUS_API_KEY`. |
| **Google OAuth** | `GOOGLE_WEB_CLIENT_ID` | MEDIUM — identifies the app to Google; can be revoked per-app. | `android/.env` → `ENV.GOOGLE_WEB_CLIENT_ID`. |
| **Weather (Open-Meteo)** | — | — | Open-Meteo is a free public API. No auth required. |
| **Internet Archive** | — | — | Public. No auth required. |
| **IPTV-org** | — | — | Public GitHub-hosted JSON catalog. No auth required. |
| **Librivox** | — | — | Public. No auth required. |
| **MusicBrainz** | — | — | Public; the `userAgent` is the only required "key" (per their etiquette). See `API_CONFIG.musicbrainz.userAgent` in `src/constants/api.ts`. |
| **Radio Browser** | — | — | Public. No auth required. |
| **TVMaze** | — | — | Public. No auth required. |

## 2. Architectural decision: keep secrets in `android/.env` (no server-side proxy)

### Why

- **Scale**: SIMBA is a single-tenant mobile app at ~10k users. No server-side component to host a proxy.
- **Practical**: Podcast Index's API allows per-app rate limits (~5 req/s with the HMAC) which is more than enough for a 10k-user app.
- **Reversible**: if the scale changes, the env-var pattern is straightforward to move behind a server proxy without changing the adapter surface.

### Trade-offs acknowledged

- **APK contains the env vars** — anyone who unzips the APK can read them. For Podcast Index's HMAC, this means a user could submit fake feeds. The mitigation is that the rate limit + the fact that Podcast Index editors reject suspicious submissions keeps this from being a real attack surface.
- **No rotation flow** — there's no way to rotate the API key without shipping a new APK. For Podcast Index, the mitigation is that the user controls the key (per-app) and can rotate in their own time.

### When to revisit

- If SIMBA ever adds user-generated API keys (each user supplies their own Podcast Index creds) → these need to live in MMKV per-user, not in `android/.env`.
- If the user base grows past ~50k or a competitor emerges → move all paid tiers behind a server proxy.
- If a key is compromised → rotate in `android/.env` + ship a new APK. The env-var pattern means this requires an APK release, not a server deploy — accepted.

## 3. The four env-var-based keys in detail

```
PODCAST_INDEX_API_KEY=...        # app-only public key
PODCAST_INDEX_API_SECRET=...     # HMAC secret — DO NOT log
JAMENDO_CLIENT_ID=...            # public OAuth client_id
JAMENDO_CLIENT_SECRET=...        # app-only secret
AUDIUS_API_KEY=...               # discovery-node read key
GOOGLE_WEB_CLIENT_ID=...         # identifies the app to Google
```

See `md/SIMBA_V21_ENV.md` for the `.env` quickstart + `md/SIMBA_V21_KEYSTORE.md` for the release-build keystore recipe (the 4 KEYSTORE_* vars are unrelated to these 6 service keys).

## 4. CI workflow

```
GitHub Actions secrets (repo Settings → Secrets):
  - PODCAST_INDEX_API_KEY
  - PODCAST_INDEX_API_SECRET
  - JAMENDO_CLIENT_ID
  - JAMENDO_CLIENT_SECRET
  - AUDIUS_API_KEY
  - GOOGLE_WEB_CLIENT_ID
  - KEYSTORE_BASE64          # W4 P13 keystore (separate concern)
  - KEYSTORE_PASSWORD        # W4 P13
  - KEY_ALIAS                # W4 P13
  - KEY_PASSWORD             # W4 P13

CI job step:
  - name: Write android/.env
    run: |
      cp android/.env.example android/.env
      echo "PODCAST_INDEX_API_KEY=${{ secrets.PODCAST_INDEX_API_KEY }}"   >> android/.env
      echo "PODCAST_INDEX_API_SECRET=${{ secrets.PODCAST_INDEX_API_SECRET }}" >> android/.env
      echo "JAMENDO_CLIENT_ID=${{ secrets.JAMENDO_CLIENT_ID }}"         >> android/.env
      echo "JAMENDO_CLIENT_SECRET=${{ secrets.JAMENDO_CLIENT_SECRET }}" >> android/.env
      echo "AUDIUS_API_KEY=${{ secrets.AUDIUS_API_KEY }}"                >> android/.env
      echo "GOOGLE_WEB_CLIENT_ID=${{ secrets.GOOGLE_WEB_CLIENT_ID }}"    >> android/.env
```

W4 P13 / P16 already wire the keystore + .env validation (Gradle task `validateEnv`). This doc is the credential inventory, not the workflow — see `md/SIMBA_V21_ENV.md` for the workflow.

## 5. Runtime handling — no logging

The adapters read credentials via `ENV.<KEY>` (`src/constants/env.ts`). The adapters themselves do NOT log the values — only the keys (or the fact that they're missing). Verified by `git grep -n 'logger.*API_KEY\|logger.*CLIENT_SECRET'` returning 0 matches across `src/infrastructure/api/`.

If you add a new adapter that needs credentials:
1. Add the key to `android/.env.example` with an empty value (T02.02 fail-fast catches missing keys).
2. Add the key to `src/constants/env.ts` (typed access).
3. Add the secret to `src/constants/api.ts` (per-provider config).
4. Add the secret to the CI workflow above.
5. **Do not log the secret value anywhere in the codebase.**

Refs: md/SIMBA_V21_DEFECTS.md (D-024 closes here for the credential aspect),
md/SIMBA_V21_ENV.md (the .env workflow),
md/SIMBA_V21_KEYSTORE.md (the unrelated keystore workflow).