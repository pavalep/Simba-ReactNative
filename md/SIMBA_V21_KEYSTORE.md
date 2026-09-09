# SIMBA — Release keystore (V21 W4 P13)

How to generate the release keystore for the SIMBA Android app, where to store the 4 env vars (`KEYSTORE_PATH` / `KEYSTORE_PASSWORD` / `KEY_ALIAS` / `KEY_PASSWORD`), and how CI restores the keystore without committing it.

This closes defect **D-001** (release build signed with debug keystore). See `md/SIMBA_MOBILE_V21_TRACKER.md` P13 + `md/SIMBA_V21_DEFECTS.md` for context.

---

## 1. Generate the keystore (one-time, on a secure machine)

```bash
keytool -genkeypair -v \
  -keystore release.keystore \
  -alias simba \
  -keyalg RSA -keysize 2048 -validity 9125 \
  -storepass '<PICK-A-STRONG-PASSWORD>' \
  -keypass '<PICK-A-STRONG-PASSWORD>' \
  -dname "CN=SIMBA,O=SIMBA,L=Earth,ST=Earth,C=US"
```

Notes:
- **`-validity 9125`** = 25 years (Google Play's hard minimum is 25 years for new uploads; longer is fine).
- **`-alias simba`** is the human-readable name referenced by `KEY_ALIAS` (line 3 below).
- **`-storepass` and `-keypass`** are the same here for simplicity. The 2 passwords can differ — see step 3 if you want them to.
- The keystore file (`release.keystore`) is the **private signing key for every release of this app**. **Never commit it.** It must outlive every device that has the installed APK (re-signing with a different key is a Play Store upload error).

After generation:
- Copy `release.keystore` to `android/app/release.keystore` on the build machine.
- Add `android/app/release.keystore` to `.gitignore` (already there via `*.keystore` — verify before committing).

---

## 2. The 4 env vars

The `release` signing config in `android/app/build.gradle` reads these from the shell environment:

| Var | What it points at | Where it's read |
| |
| `KEYSTORE_PATH` | Absolute path to the keystore file | `storeFile file(ksPath)` |
| `KEYSTORE_PASSWORD` | The `-storepass` value | `storePassword ksPass` |
| `KEY_ALIAS` | The `-alias` value (e.g. `simba`) | `keyAlias ksAlias` |
| `KEY_PASSWORD` | The `-keypass` value | `keyPassword keyPass` |

If any of the 4 is missing at build time, `:app:assembleRelease` fails fast with:

```
Release signing requires 4 env vars: KEYSTORE_PATH, KEYSTORE_PASSWORD,
KEY_ALIAS, KEY_PASSWORD. Missing: <list>. See md/SIMBA_V21_KEYSTORE.md
for keystore generation and md/SIMBA_V21_ENV.md §5 for CI setup.
```

This is intentional (V21 W4 P13 + D-001) — better to fail at the top than to silently ship a debug-signed release.

---

## 3. Local dev setup

Add the 4 lines to your shell rc (`.zshrc` / `.bashrc` / PowerShell `$PROFILE`):

```bash
export KEYSTORE_PATH="$HOME/.keystore/simba/release.keystore"
export KEYSTORE_PASSWORD="<your-storepass>"
export KEY_ALIAS="simba"
export KEY_PASSWORD="<your-keypass>"
```

Then build:

```bash
cd android
./gradlew :app:assembleRelease
```

Expected output: `android/app/build/outputs/apk/release/app-release.apk`, signed with the release keystore.

Verify the signature:

```bash
$ANDROID_HOME/build-tools/<version>/apksigner verify --verbose \
  android/app/build/outputs/apk/release/app-release.apk
# Expected: "Verified using v1 scheme (JAR signing): true" + "Verified using v2 scheme (APK Signature Scheme v2): true"
```

---

## 4. CI setup (GitHub Actions)

The recommended pattern is to base64-encode the keystore and store it as a secret. The CI workflow then restores the keystore into a temp file at build time (never written to disk in a checked-in location).

### 4a. One-time: base64-encode the keystore locally

```bash
base64 -i android/app/release.keystore -o release.keystore.b64
# Upload the contents of release.keystore.b64 to GitHub:
#   repo Settings → Secrets and → New secret
#   name: KEYSTORE_BASE64
#   value: <paste the .b64 contents>
```

(The 3 passwords + alias go into separate secrets: `KEYSTORE_PASSWORD`, `KEY_PASSWORD`, `KEY_ALIAS`.)

### 4b. CI workflow

```yaml
- name: Restore keystore
  run: |
    mkdir -p /tmp/simba-keystore
    echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 --decode > /tmp/simba-keystore/release.keystore
    echo "KEYSTORE_PATH=/tmp/simba-keystore/release.keystore" >> $GITHUB_ENV
    echo "KEYSTORE_PASSWORD=${{ secrets.KEYSTORE_PASSWORD }}" >> $GITHUB_ENV
    echo "KEY_ALIAS=${{ secrets.KEY_ALIAS }}" >> $GITHUB_ENV
    echo "KEY_PASSWORD=${{ secrets.KEY_PASSWORD }}" >> $GITHUB_ENV

- name: Build signed release APK
  working-directory: android
  run: ./gradlew :app:assembleRelease
```

The keystore lives only in the ephemeral `$RUNNER_TMP` for the duration of the job — never on disk, never in a git index.

---

## 5. Rotation procedure (only if the keystore is compromised)

1. Generate a new keystore (step 1) with a **different alias**.
2. Update the Play Store listing's signing key (Google Play App Signing lets you upload a new upload key and re-sign the app-signing key server-side).
3. Bump `KEY_ALIAS` + the 3 password secrets in CI.
4. The `versionCode` in `android/app/build.gradle` (currently `2`) must be incremented for the first post-rotation upload.

For V21 this is forward-looking — there's only one keystore and no rotation has happened. The `simba-backup-before-npm-module-addition-to-project/` snapshot does **not** contain the release keystore (it was created before P13).

---

## 6. Common mistakes

| Mistake | What breaks | Fix |
| |
| Committing `release.keystore` to git | Public exposure; Play Store refuses the upload if the key was already used elsewhere | `git rm --cached android/app/release.keystore`; rotate the key (step 5) |
| Setting `KEYSTORE_PASSWORD` and `KEY_PASSWORD` to the same value when the keystore was generated with `-keypass` different | `keyPassword` mismatch error | Re-check the `keytool -genkeypair -keypass` value used at generation |
| Running `:app:assembleRelease` from a shell that doesn't have the 4 env vars | Build fails with the clear "Missing: ..." error from step 2 | Source the rc file (or restart the terminal after editing `.zshrc`) |
| Using `gradlew` from the wrong directory | "Task ':app:assembleRelease' not found" | `cd android` first |

---

## 7. See also

- `md/SIMBA_MOBILE_V21_TRACKER.md` — P13 (T13.01 signing config, T13.02 ProGuard, T13.03 this doc, T13.04 device install)
- `md/SIMBA_V21_ENV.md` — §5 for the full CI workflow including the `.env` write step
- `md/SIMBA_V21_DEFECTS.md` — D-001 entry (closes here)
- `android/app/build.gradle` — the `signingConfigs.release` block that reads these 4 vars
- https://reactnative.dev/docs/signed-apk-android — upstream RN signing guide