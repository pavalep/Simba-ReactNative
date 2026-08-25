# Video V3 runtime log diagnosis

**Capture:** 25 August 2026, emulator `emulator-5554`, Android 17 x86_64.

The current logcat contains a real native process abort, not only a UI warning. The app process `com.simba.player` (PID 22018) received `SIGABRT` because Android fdsan reported: `failed to exchange ownership of file descriptor: fd 208 is owned by unique_fd ..., was expected to be unowned`. The crash report was generated at 14:29:13.812 and identifies the process death at 14:29:13.936.

The playback timeline immediately before the abort shows mpv initialization succeeded, the load request was accepted, and the native surface was being attached. The old native implementation stored a JNI `Surface` global-reference address as mpv's `wid`. That is not the Android native-window handle expected by mpv and is unsafe during surface attach/detach churn. The native implementation has been changed to use `ANativeWindow_fromSurface`, pass the native window pointer as `wid`, and release it through the controlled detach/destroy path.

The same playback attempt also failed independently because the source URL contained a raw space: `https://archive.org/download/jesus-film-mawchi-language/JESUS Film Mawchi Language.mp4`. libmpv's curl backend reported `URL using bad/illegal format or missing URL`, then the ytdl hook attempted `yt-dlp`, `yt-dlp_x86`, and `youtube-dl`, none of which were available, and emitted end-file error `-13`. The Android bridge now percent-encodes raw whitespace/control characters in HTTP(S) inputs and playlist entries.

Additional non-blocking warnings were observed. FastImage repeatedly uses the legacy `RCTEventEmitter` path under Bridgeless/Fabric; the custom mpv view manager falls back because no generated setter is available; and NativeEventEmitter reported missing `addListener`/`removeListeners` methods. The mpv bridge now exposes those listener methods. FastImage remains a separate dependency migration item.

The fixes compiled successfully after the changes:

- TypeScript: `TSC_EXIT=0`.
- Targeted V3/overlay ESLint: `ESLINT_EXIT=0`.
- Android `:app:compileDebugKotlin :app:externalNativeBuildDebug`: `ANDROID_EXIT=0`.

The captured logcat predates installation of this rebuilt native binary. Device acceptance is therefore still open and requires APK rebuild/reinstall followed by a clean reproduction.
