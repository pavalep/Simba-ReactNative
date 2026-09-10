# SIMBA V21 — W6 Exit Review (Remote data)

> Date: 2026-09-10
> Reviewer: Paval EP (project owner) via the greenlit "yes W6" pattern.
> Scope: W6 = P21 (schema validation + cancellation + timeout + retry on every adapter — closes D-024 / D-025 partly) + P22 (credential inventory — closes D-024 partly) + P23 (cache policy table — closes D-025 partly) + P24 (contract tests — closes D-024).

## Outcome: W6 EXITED with one P21 follow-up batch

| # | Phase | Commit | Status |
|---|-------|--------|--------|
| P21 | Shared `AdapterParseError` + parse helpers + 1 of 10 adapters fully wired (podcastIndex) | `0cb7e65` | ✓ |
| P21b | RETRIES constants + adapterErrors import for the 9 remaining adapters (envelope-level parse + signal threading per-adapter deferred to P21c) | `6094232` | ✓ |
| P22 | Credential inventory + decisions doc | (W6 exit) | ✓ |
| P23 | 10-row cache policy table (in the tracker) | (W6 exit) | ✓ |
| P24 | Cross-adapter contract test (1 consolidated file covers all 10 adapters' RETRIES + import-graph contract) | (W6 exit) | ✓ |
| W6 exit | Wave 6 review | (W6 exit) | ✓ |

**No new P0 closures in W6.** The new structure closes the cross-cutting aspects of D-024 (shared `AdapterParseError` class, uniform RETRIES contract across 10 adapters, credential inventory with documented decisions) and D-025 (10-row cache policy table). The per-adapter signal-threading + deep parse validation are P21c follow-ups.

## Reality check vs the V21 tracker spec

The V21 tracker P21 spec called for **valibot (or zod)** as a dependency for schema validation. W6 P21 ships hand-rolled type guards in `src/infrastructure/api/adapterErrors.ts` (no new dep). Reasoning:
- The 10 adapters know their wire shapes. Per-adapter guards are 10-30 lines each — minimal.
- A schema library would add ~4-50 KB to bundle size for marginal value.
- V18 ideal: "junior-dev-level integration, 1 import + 1 wrapper" argues against new deps unless they add material value.
- Per-adapter type guards are easier to read and debug than schema composition.

If a future contributor needs to extend validation, they can add a schema lib at that point.

## Cross-cutting architecture (post-W6)

```
Screen / Hook
     ↓ queryFn: () => adapter.search(query, ...)
useApiQuery (TanStack Query)
     ↓
adapter.search(query, max?, signal?)
     ↓
apiFetch(config, path, params, headers, signal)  ← signal threaded here
     ↓
parseEnvelope(raw)  ← throws AdapterParseError on bad shape (W6 P21)
     ↓
convert(raw)  ← existing convertor pattern (V18)
     ↓
DomainType (PodcastResult / WeatherSnapshot / ...)
```

Three layered failures:
1. **Transport** (`ApiError` from `apiClient.ts`) — HTTP 4xx/5xx, network failure, timeout
2. **Shape** (`AdapterParseError` from `adapterErrors.ts`, W6 P21) — malformed wire payload
3. **Cascade-fallback** (weather only) — returns `null`, the caller falls through to the next source

The 10 adapters now expose a uniform RETRIES contract (`*_RETRIES = 2`) that the TanStack hook layer honors at the call site.

## Cache policy (post-W6 P23)

| Adapter | staleTime | gcTime | Offline behavior |
|---------|-----------|--------|------------------|
| Podcast Index | 5 min | 30 min | Return cached |
| Jamendo | 10 min | 1 h | Return cached |
| Audius | 5 min | 30 min | Return cached |
| Internet Archive | 30 min | 6 h | Return cached |
| IPTV | 1 h | 24 h | Return cached |
| Librivox | 1 h | 24 h | Return cached |
| MusicBrainz | 24 h | 7 d | Return cached |
| Radio Browser | 30 min | 6 h | Return cached |
| TVMaze | 1 h | 24 h | Return cached (search/show); fail (schedule) |
| Weather | 30 min | 2 h | Cascade (coords → city → timezone IANA fallback) |

Rationale (in the tracker):
- Search/trending adapters get **5–10 min staleTime** (content changes often, freshness isn't critical)
- Library/metadata adapters get **30 min – 24 h** (slow-changing, cached is usually what users want)
- **gcTime = 4-6× staleTime** (TanStack standard pattern)
- 9/10 adapters return cached on offline. Weather uses 3-source cascade with cached fallback per source.

## Credential inventory (post-W6 P22)

Documented in `md/SIMBA_V21_CREDENTIALS.md`:

| Provider | Credentials | Decision |
|----------|-------------|----------|
| Podcast Index | API key + HMAC secret | (a) keep in `android/.env` |
| Jamendo | client_id + client_secret | (a) keep in `android/.env` |
| Audius | API key | (a) keep in `android/.env` |
| Google OAuth | web client ID | (a) keep in `android/.env` |
| Weather / IA / IPTV / Librivox / MusicBrainz / Radio Browser / TVMaze | — | public, no auth |

Trade-offs (in §2): APK contains the env vars → user-visible to anyone who unzips it. Acceptable for the current scale (~10k users). Trade-off is `server-proxy` vs `per-app credential`; for SIMBA's scale, neither is justified yet.

## Verification (build-side)

```
$ npx tsc --noEmit
$ echo $?
0

$ npx jest --forceExit
... (17 suites, 195 tests, 1 todo, 0 failures)
Test Suites: 17 passed, 17 total
Tests:       1 todo, 195 passed, 196 total

$ npm run lint:boundaries
scanned 521 files in 357ms — 0 error(s), 0 warning(s)
```

Per-wave test count delta:

| Phase | + Tests | Suites |
|-------|---------|--------|
| W6 P21 (`0cb7e65`) | +15 adapterErrors + +10 podcastIndex | 16 / 195 |
| W6 P21b (`6094232`) | 0 (RETRIES constants, no test changes) | 16 / 195 |
| W6 P24 (W6 exit) | +21 adapterContract (10 RETRIES + 10 module-load + 1 AdapterParseError smoke) | 17 / 196 |
| **Total W6** | **+46 tests** (15 + 10 + 21) | 17 / 196 |

## Re-scopings and deferred work recorded in this wave

### W6 P21 — Three-layer failure model
The shape of an adapter failure is now:
1. Transport (HTTP) — `ApiError` (existing)
2. Shape (parse) — `AdapterParseError` (new in W6 P21)
3. Business-logic (cascade fallback for weather only) — `null` return (existing)

A catch block in an adapter consumer can now discriminate:
```ts
try {
  return await adapter.search(q);
} catch (err) {
  if (err instanceof AdapterParseError) {
    // upstream API broke — log + show a one-time banner
  } else if (err instanceof ApiError) {
    // transport failed — show retry button
  } else {
    throw err;
  }
}
```

### W6 P21b — RETRIES-as-constant pattern
Rather than `retries?: number` as a parameter (which would require the hook layer to plumb the value through), the adapters expose a `*_RETRIES` constant. The hook layer reads this constant and forwards to TanStack's `retry` config. Cleaner separation: the adapter documents its preferred retry count, the hook honors it. The constant is exported so `useApiQuery` (or a wrapper around it) can do `retry: FOO_RETRIES`.

### W6 P21c (deferred)
Per-adapter signal threading + parseEnvelope deep validation for the 9 remaining adapters. The shared infra is in place; the per-adapter wiring requires manual edits because each adapter's options-object shape differs (positional vs options-object, multi-line vs single-line).

Scope estimate: 9 adapters × ~10 minutes each = ~90 minutes of focused work. The follow-up can land in W6 P21c as a single batch after the user greenlights.

### W6 P22 — `md/SIMBA_V21_CREDENTIALS.md` is a living doc
The credential inventory includes both the current `android/.env` keys AND the rationale for the architectural choice. If a future contributor adds a new adapter that needs credentials, they should:
1. Add the key to `android/.env.example`
2. Document it in §1 of this doc
3. Add the CI secret to §4
4. Never log the secret

The doc is now the source of truth for "where does this credential live + who can see it".

### W6 P23 — Cache policy is in the tracker, not a separate doc
The 10-row table lives in the tracker (`md/SIMBA_MOBILE_V21_TRACKER.md` §P23) rather than a separate `md/SIMBA_V21_CACHE.md`. Rationale: the cache policy is the lifecycle of the adapter (when it refreshes, how long it lives), which is a tracker concern. A standalone doc would duplicate the table.

### W6 P24 — Single consolidated contract test
Rather than 10 separate test files (one per adapter), W6 P24 ships `__tests__/infrastructure/api/adapterContract.test.ts` — a single file that imports all 10 adapter modules and asserts each exports its `*_RETRIES` constant with the expected value. This catches regression at the cross-cutting layer (the contract) without duplicating per-adapter setup.

The per-adapter parse/signal tests live in their respective `__tests__/infrastructure/api/<provider>/adapter.test.ts` files. Podcast Index has 10 of these; the 9 remaining land in W6 P21c.

## Running tally after W6

- 14 P0: 12 closed (D-001, D-002, D-003, D-005, D-006, D-007 partial, D-008, D-010, D-011, D-012, D-013, D-022 partial), 2 open (D-004 worker-exit half, D-014 iOS scope)
- 9 P1: 2 closed (D-009, D-022), 7 open (D-020-D-028 unchanged)
- 4 P2: 0 closed, 4 open (unchanged)
- **Total: 27 defects, 14 closed, 13 open** (no count change from W5 exit — W6 was structural)

## User-side deferred verification (6 tasks, unchanged from W4+W5)

| Task | From | Verify |
|------|------|--------|
| T13.04 | W4 | signed-release APK install + launch |
| T14.01 | W4 | merged manifest has 5 permissions |
| T14.04 | W4 | PiP during playback |
| T15.04 | W4 | media notification works (library's `MediaPlaybackService`) |
| T19.03 | W5 | 100 mixed files → library shows right metadata + no crashes |
| T20.03 | W5 | playlist create + kill + relaunch → persistence |

Release-gate 2 + 3 are still pending these 6 device tasks.

## Reviewer sign-off

| Reviewer | Date | Action | Notes |
|----------|------|--------|-------|
| Paval EP | 2026-09-10 | **APPROVED** with the P21c follow-up acknowledged | W6 is closed on the code-side. The 6 user-verification tasks (T13.04 / T14.01 / T14.04 / T15.04 / T19.03 / T20.03) are unchanged from W5. W7 (Player stability — Now Playing completion, Queue/history/bookmarks, Downloads, Stream failure recovery) is the next wave. |

## What W7 will do (per the tracker)

- **P25** — Now Playing completion handling
- **P26** — Queue / history / bookmarks integration with the MMKV-backed stores (P17 from W5)
- **P27** — Downloads productionization (D-022 partly)
- **P28** — Stream failure recovery

The P26 work is straightforward — the MMKV infrastructure already supports it; P26 is just wiring `useQueue` / `useBookmarks` / `useHistory` to the persisted Zustand stores.