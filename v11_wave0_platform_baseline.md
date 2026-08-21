# SIMBA v11 Wave 0 — Platform Baseline

**Date:** 21 August 2026  
**Project:** `SimbaPlayer` / display name `Simba Player`  
**Native iOS target name:** `CinePlayer`  
**Application identifier:** `com.simba.player`

## JavaScript and React Native baseline

| Item | Current value |
|---|---|
| React Native | `0.86.0` |
| React | `19.2.3` |
| TypeScript | `^5.8.3` |
| Node engine | `>=22.11.0` |
| Architecture | `newArchEnabled=true` |
| JavaScript engine | Hermes enabled |
| Android architectures | `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64` |
| Package scripts | Android run, iOS run, Metro, Jest, ESLint |

## Android baseline

| Item | Current value |
|---|---|
| Application ID | `com.simba.player` |
| Version code | `2` |
| Version name | `1.1.0` |
| Minimum SDK | `24` |
| Compile SDK | `36` |
| Target SDK | `36` |
| Build tools | `36.0.0` |
| NDK | `27.1.12297006` |
| Kotlin | `2.1.20` |
| React Native architecture | New Architecture enabled |
| JavaScript engine | Hermes enabled |

## iOS baseline

| Item | Current value |
|---|---|
| Native target | `CinePlayer` |
| Bundle identifier | `com.simba.player` |
| Deployment target | iOS `15.1` |
| Marketing version | `1.0` |
| Current project version | `1` |
| Swift version | `5.0` |
| Device capabilities | arm64 required |
| iPhone orientation | Portrait |
| iPad orientations | Portrait and landscape |
| Local networking | Allowed by ATS configuration |
| Location permission | Weather-on-Home explanation is present |

## Permissions and rationale

| Permission/capability | Platform | Purpose | Release note |
|---|---|---|---|
| Internet | Android | API catalogs, remote streams, authentication, artwork, and metadata | Required for remote content; offline surfaces must degrade cleanly |
| Coarse/fine foreground location | Android | Weather greeting on Home | Requested only at runtime; denial must not block the Home journey |
| Notification posting | Android 13+ | Foreground media playback notification and transport actions | Permission denial must leave in-app playback usable |
| Foreground media service | Android 14+ | Background/foreground media playback service | Native lifecycle and notification behavior require device verification |
| Content URI handling and persistable access | Android | Shared audio/video files and linked local content | Permission may be temporary; missing/denied content needs recovery copy |
| Location when in use | iOS | Weather greeting on Home | `Info.plist` contains an explanation; denial must not block Home |
| Local networking allowance | iOS | Local network media/content scenarios | ATS allows local networking while arbitrary loads remain false |
| Camera/photo/microphone permissions | Both | No declaration observed in the current baseline | Do not request or advertise features requiring them until explicitly added |

## Native media dependencies and release concerns

The project uses a custom mpv-based native bridge through `src/native/player.api.ts`, with a Turbo Module first and legacy bridge fallback. Android and iOS native media behavior must therefore be tested on both supported platforms rather than inferred from JavaScript rendering. The bridge exposes source loading, transport controls, seeking, tracks, chapters, volume/mute, speed, loop, and property observation.

## Clean-build checklist for the final gate

This checklist is prepared now but must be executed at the release-candidate gate:

| Step | Android | iOS |
|---|---|---|
| Install dependencies | Confirm lockfile and clean `node_modules` install | Confirm lockfile and clean `node_modules` install |
| Native dependencies | Clean Gradle build cache; verify mpv native artifacts and ABIs | Run Pods install/update under the locked React Native version; verify mpv/native pods |
| JavaScript checks | TypeScript, Jest, ESLint, Metro bundle | TypeScript, Jest, ESLint, Xcode bundle/archive |
| Debug verification | Launch emulator and run route/player smoke sheet | Launch simulator/device and run route/player smoke sheet |
| Release verification | `assembleRelease`/signed variant, minification review, install APK/AAB | Archive/export, signing/provisioning review, install IPA/TestFlight artifact |
| Evidence | Save commands, exit codes, device/API, screenshots/logs | Save commands, exit codes, device/iOS, screenshots/logs |

## Proposed minimum device matrix

The following is the working matrix for future wave gates until the product/release owner confirms a narrower supported matrix:

| Platform | Minimum gate device | Coverage purpose |
|---|---|---|
| Android compact | API 24-compatible emulator or device | Minimum SDK, auth, navigation, local file permissions |
| Android current | API 35/36 emulator or device | Current notification/foreground service/PiP behavior and media playback |
| Android large | One large-screen Android profile | Responsive shell, lists, overlays, orientation |
| iOS minimum | iPhone simulator/device on iOS 15.1 | Deployment floor, auth, navigation, local media |
| iOS current | Current supported iPhone simulator/device | Playback, lifecycle, permissions, performance |
| iPad | iPad simulator/device if included in release | Orientation and large-layout behavior |

## Verification status

This is a configuration baseline, not a build result. The project instruction is to defer full build/test gates until the overhaul waves are complete. Fresh Android release build, iOS archive/build, emulator/device playback, permission, lifecycle, and PiP evidence remain open. The TypeScript evidence currently available is `tscheck_playback_module_final.log` with `TSC_EXIT=0`.

## Release readiness findings

The current Android release build is **not production-ready**: `android/app/build.gradle` uses the debug keystore for the `release` build type and sets `enableProguardInReleaseBuilds = false`. These are baseline findings only; no release build was executed.

## Platform decisions still required

1. Confirm the exact supported iOS device/version matrix and whether iPad is a release target.
2. Confirm the Android device/API matrix and release signing configuration.
3. Confirm whether the Android `1.1.0` and iOS `1.0` version values should be aligned before candidate packaging.
4. Confirm platform-specific PiP requirements and any native entitlement or manifest changes.
