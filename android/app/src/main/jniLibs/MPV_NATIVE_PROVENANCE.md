# SIMBA bundled mpv native libraries

- Source: [mpv-android 2026-08-11 release](https://github.com/mpv-android/mpv-android/releases/tag/2026-08-11)
- Release commit: `ad98fc97ff1d25e217389e7238a1abda8c13a6c4`
- Native stack: libmpv built from mpv `f4d13e1`, mbedTLS `3.6.7`, FFmpeg `9.0`
- Reason for update: upstream release includes the maintained mbedTLS TLS-connection fix; the previous bundled library produced `mbedtls_ssl_handshake returned -0x6600` and `end-file error=13 reason=4` for Jamendo HTTPS streams.
- Backup: `tools/native-backups/2026-08-22-pre-mpv-2026-08-11`
- All four packaged ABIs were updated: arm64-v8a, armeabi-v7a, x86, x86_64.

