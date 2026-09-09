# SIMBA — Environment configuration (V21 P02)

How to get a fresh checkout building on Android. For the iOS story, see `md/SIMBA_MOBILE_V21_SPECIFICATION.md` (iOS is explicitly out of V21 scope).

## 1. Copy the example file

```bash
cd android
cp .env.example .env
```

The `.env.example` file is checked in next to `android/app/build.gradle` and lists every key the app needs. The actual `.env` is gitignored — never commit real keys.

## 2. Fill in the keys

Open `android/.env` and fill in:

| Key | Used by | What happens if empty |
|-----|---------|------------------------|
| `PODCAST_INDEX_API_KEY` | `src/services/api/podcastIndexAdapter.ts` (podcast search, episodes, categories) | Podcast search returns an empty list |
| `PODCAST_INDEX_API_SECRET` | Same adapter (SHA-1 auth) | Same |
| `JAMENDO_CLIENT_ID` | `src/services/api/jamendoAdapter.ts` (music search, trending) | Music search returns an empty list |
| `JAMENDO_CLIENT_SECRET` | Same adapter | Same |
| `AUDIUS_API_KEY` | `src/services/api/audiusAdapter.ts` (music search) | Audius search returns an empty list |
| `GOOGLE_WEB_CLIENT_ID` | `src/services/authService.ts` (OAuth sign-in) | App falls back to guest session |

Free keys (no payment required):
- **Podcast Index**: https://api.podcastindex.org/signup
- **Jamendo**: https://developer.jamendo.com/v3.0
- **Audius**: https://audius.co/api (no key required for read-only; key only for write operations — empty is fine for V21)
- **Google Web Client ID**: optional in V21 (V22 if you ship sign-in)

The empty-string fallback is intentional: adapters that read a missing key see `''` and skip the network call. A MISSING `.env` file (no line at all) fails the Gradle build with the clear error in step 3.

## 3. Verify the build fails fast without `.env`

```bash
mv android/.env android/.env.bak
cd android && ./gradlew :app:assembleDebug
# Expected: "android/.env is missing. Copy android/.env.example ..."
mv android/.env.bak android/.env
```

This is enforced by the validator added in V21 P02 T02.02 at the top of `android/app/build.gradle`.

## 4. Verify the build succeeds with `.env`

```bash
cd android
./gradlew clean :app:assembleDebug
```

Expected: a debug APK at `android/app/build/outputs/apk/debug/app-debug.apk`.

## 5. CI / GitHub Actions

In a CI workflow, the recommended pattern is to base64-encode the keystore and store it as a secret:

```yaml
- name: Restore keystore
  run: |
    echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 --decode > android/app/release.keystore
- name: Set keystore env
  run: |
    echo "KEYSTORE_PATH=$PWD/android/app/release.keystore" >> $GITHUB_ENV
    echo "KEYSTORE_PASSWORD=${{ secrets.KEYSTORE_PASSWORD }}" >> $GITHUB_ENV
    echo "KEY_ALIAS=${{ secrets.KEY_ALIAS }}" >> $GITHUB_ENV
    echo "KEY_PASSWORD=${{ secrets.KEY_PASSWORD }}" >> $GITHUB_ENV
- name: Write android/.env
  run: |
    cp android/.env.example android/.env
    # Override the keys from secrets
    echo "PODCAST_INDEX_API_KEY=${{ secrets.PODCAST_INDEX_API_KEY }}" >> android/.env
    echo "PODCAST_INDEX_API_SECRET=${{ secrets.PODCAST_INDEX_API_SECRET }}" >> android/.env
    # ... repeat for each key
- name: Build
  run: ./gradlew :app:assembleRelease
```

(For V21, this is the W4 P13 work — the signed-release build + the env-var keystore. The CI workflow itself is V8 P29.)

## 6. Production secrets (read this!)

**No client-side paid-API credentials are safe in a distributable build.** V21 P22 (D-024) covers this. For V21, all 6 keys above are read-only or free-tier; if you ever need to add a paid credential, the right move is:

1. **Backend proxy** (preferred): stand up a thin server that holds the credential and exposes only the read-only endpoints. The app calls the proxy, not the provider.
2. **Per-user credential flow**: each user signs up themselves and provides their own key. The app stores the user-supplied key in MMKV/AsyncStorage.
3. **Release-disable the adapter**: leave the credential in `.env.example` commented out, document why, and `enabled: false` the adapter in V21 P22.

For V21, none of the 6 keys require any of this — they're all free. This is a forward-looking note for V22.
