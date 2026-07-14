# Cine — React Native Mobile App

This document provides a comprehensive analysis of the **Cine desktop application** (built with Avalonia/.NET) and outlines everything that needs to be tackled when building the **React Native mobile version**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Desktop Architecture (Avalonia)](#2-desktop-architecture-avalonia)
3. [Core Features to Port](#3-core-features-to-port)
4. [Architecture Layers & Migration Strategy](#4-architecture-layers--migration-strategy)
5. [Detailed Component Inventory](#5-detailed-component-inventory)
6. [Media Playback Engine](#6-media-playback-engine)
7. [State Management & Persistence](#7-state-management--persistence)
8. [UI Component Breakdown](#8-ui-component-breakdown)
9. [Feature Toggle & Licensing System](#9-feature-toggle--licensing-system)
10. [Navigation & Routing](#10-navigation--routing)
11. [Services Reference](#11-services-reference)
12. [Mobile-Specific Considerations](#12-mobile-specific-considerations)
13. [Implementation Phases](#13-implementation-phases)
14. [File Map: Desktop → React Native](#14-file-map-desktop--react-native)

---

## 1. Project Overview

**Cine** is a high-performance media player application currently built as a **Windows desktop app** using the Avalonia UI framework (.NET 10.0). It uses **libmpv** as its media playback engine with hardware-accelerated rendering via ANGLE/EGL (OpenGL ES) and Direct3D 11.

### Tech Stack (Desktop)

| Layer | Technology |
|---|---|
| UI Framework | Avalonia 12.0.3 (XAML-based) |
| Language | C# (.NET 10.0) |
| DI Container | Microsoft.Extensions.DependencyInjection |
| Media Engine | libmpv-2 (mpv player) + Media Foundation fallback |
| Rendering | ANGLE EGL (OpenGL ES) / D3D11 |
| Icons | Material.Icons.Avalonia |
| Packaging | MSIX (Windows App Installer) |

### Target: React Native Mobile App

| Layer | Technology |
|---|---|
| UI Framework | React Native CLI (no Expo) |
| Language | TypeScript |
| State Management | **Redux Toolkit** (see §7) |
| Media Engine | **Custom libmpv via Turbo Module + JNI** (no third-party RN video packages) |
| Navigation | React Navigation |
| Icons | react-native-vector-icons (Material Icons) |

---

## 2. Desktop Architecture (Avalonia)

### Solution Structure (`Cine.sln`)

The solution has **3 project layers**:

```
Cine.sln
├── src/Core/          — Domain models, config, logging (no dependencies)
├── src/Media/         — Media playback abstractions + implementations (mpv, MF)
├── src/App/           — Avalonia UI app (views, viewmodels, services, controls)
└── src/MediaSmoke/    — Smoke test program for media playback
```

### Dependency Flow

```
App (Avalonia UI) ───▶ Media (Player Interfaces) ───▶ libmpv-2.dll
     │                        │
     │                        ├── MpvPlayer (primary)
     │                        ├── MediaFoundationPlayer (fallback)
     │                        └── SoftwareFallbackCodecProvider
     │
     └──▶ Core (Config, Logging)
          └── AppSettings, FileLogger, StartupManager
```

### Dependency Injection (CompositionRoot)

All services are registered in [ServiceCollectionExtensions.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Core/DependencyInjection/ServiceCollectionExtensions.cs) as singletons or transients. Key registrations:

| Lifetime | Services |
|---|---|
| **Singleton** | InputRoutingService, ThemeService, NavigationService, CodecManager, PlayerService, FeatureService, LicensingService, EventBus, PlaybackStateManager, all Domain Managers, all Storage Services |
| **Transient** | MainViewModel, StartPageViewModel, MainWindow |

---

## 3. Core Features to Port

### Phase 1: Core Playback (HIGH priority)

| Feature | Desktop Implementation | React Native Approach |
|---|---|---|
| **Open media files** | File dialogs via `IFileDialogService` | File picker (react-native-document-picker) |
| **Play/Pause/Stop** | `IPlaybackControl` → mpv commands | `react-native-video` controls |
| **Seek (forward/backward/by position)** | mpv `seek` command with timestamps | `react-native-video` `seek()` prop |
| **Volume control** | mpv volume property (0-150) | System volume via RN Video |
| **Playback speed** | mpv speed property (0.1x-8.0x) | `rate` prop in react-native-video |
| **Playlist management** | Internal playlist with next/prev/loop/shuffle | Custom playlist state management |
| **Chapter navigation** | mpv chapter-list parsing | Parse chapter metadata manually |

### Phase 2: Audio Features (HIGH priority)

| Feature | Desktop Implementation | React Native Approach |
|---|---|---|
| **Audio track selection** | mpv `aid` property | Track selection via native player API |
| **Audio delay** | mpv `audio-delay` property | Not natively supported; custom implementation |
| **Audio device selection** | WASAPI device enumeration | Native module for audio routing |
| **Dialogue boost** | Audio processing | Possible via native audio processing |
| **Equalizer (10-band)** | Feature-gated mpv equalizer | Native audio effect processing |

### Phase 3: Video Features (HIGH priority)

| Feature | Desktop Implementation | React Native Approach |
|---|---|---|
| **Video track selection** | mpv `vid` property | Track selection via native player API |
| **Video filters (contrast/brightness/gamma/saturation/hue)** | mpv video properties | Video filter props in react-native-video |
| **Zoom** | mpv video-zoom property | Pinch-to-zoom gesture + transform |
| **Aspect ratio / Crop** | mpv crop filter (`vf`) | `resizeMode` prop + manual crop |
| **Screenshot** | mpv screenshot-to-file / screenshot-raw | Native module screenshot capture |
| **Frame stepping** | mpv frame-step / frame-back-step | Not supported; requires native module |

### Phase 4: Subtitle Features (HIGH priority)

| Feature | Desktop Implementation | React Native Approach |
|---|---|---|
| **Subtitle track selection** | mpv `sid` property | Track selection via native player API |
| **External subtitle loading** | mpv `sub-add` command | Parse and pass external subtitle files |
| **Subtitle delay sync** | mpv `sub-delay` property | Manual subtitle timing |
| **Subtitle positioning** | mpv `sub-pos` property | Custom subtitle overlay component |
| **Subtitle styling (font, size, color, bold, blur, shadow, opacity)** | mpv sub-* properties | Custom styled Text components |
| **Subtitle encoding detection** | C# BOM/heuristic detection | JavaScript encoding detection library |

### Phase 5: UI & Experience (MEDIUM priority)

| Feature | Desktop Implementation | React Native Approach |
|---|---|---|
| **Start Page** | Avalonia XAML with recent files, glass-morphism UI | React Native screen with FlatList |
| **Player Page** | Video surface + overlay controls | react-native-video + overlay components |
| **Controls Box** | Play/pause, prev/next, seekbar, volume, chapter markers | Custom transport controls |
| **Seekbar** | Custom slider with chapter markers | react-native slider + custom markers |
| **Header Bar** | Title, window controls, menus | Custom header component |
| **OSD Notifications** | Slide-in overlay notifications | Animated overlay component |
| **Panels (Volume, Audio, Subtitle, Chapters, Playlist, Equalizer, Open Menu, Primary Menu)** | XAML popup panels | Modal / Drawer components |
| **Picture-in-Picture** | Separate window with second mpv instance | Native PiP API (Android/ iOS) |
| **Fullscreen** | Window mode toggle + immersive mode | Screen orientation + StatusBar hiding |
| **Drag & Drop** | Windows drag-drop events | File picker instead of drag-drop |
| **Keyboard shortcuts** | InputRoutingService + keyboard bindings | Not applicable on mobile (gesture-based) |

### Phase 6: Persistence & Services (MEDIUM priority)

| Feature | Desktop Implementation | React Native Approach |
|---|---|---|
| **Session resume** | JSON serialization of file path + position + track selections | AsyncStorage / MMKV |
| **Recent files** | RecentFilesService with file path storage | AsyncStorage / MMKV |
| **Playlist save/load** | PlaylistCoordinator with JSON persistence | AsyncStorage / MMKV |
| **Settings/Configuration** | AppSettings via ConfigService | MMKV persisted settings |
| **File logging** | FileLogger with rolling log files | Console + optional crash reporting |
| **Startup timer / performance monitoring** | PerformanceMonitor service | Not critical on mobile |

### Phase 7: Licensing & Features (LOW priority)

| Feature | Desktop Implementation | React Native Approach |
|---|---|---|
| **Feature toggle system** | FeatureStore + FeatureService with JSON definitions | Feature flag configuration |
| **License tiers (Trial/Free/Full/Pro)** | LicensingService with tier checks | In-app purchase / subscription |
| **Trial watermark** | XAML overlay bound to `IsTrial` | Watermark overlay component |
| **Feature gating (4K, 8K, HDR, DTS, Dolby Vision, etc.)** | FeatureGateAttribute + IFeatureService | Conditional rendering + native module checks |

---

## 4. Architecture Layers & Migration Strategy

### 4.1 The Desktop Architecture Pattern

The desktop app follows a **clean architecture** with these layers:

```
┌─────────────────────────────────────────────────────┐
│  Views (XAML + Code-behind)                        │
│  - Pages (PlayerPage, StartPage)                    │
│  - Components (ControlsBox, HeaderBar, Panels...)   │
│  - Dialogs (Preferences, PiP, Subtitle Settings...) │
│  - Shell (MainWindow)                              │
├─────────────────────────────────────────────────────┤
│  ViewModels (MVVM)                                  │
│  - MainViewModel (+ partial classes for concerns)   │
│  - StartPageViewModel                               │
├─────────────────────────────────────────────────────┤
│  Services                                           │
│  - Media (PlayerService, CodecManager, etc.)        │
│  - UI (DragDrop, OSD, PiP, FileDialogs)             │
│  - Persistence (Session, Playlist, RecentFiles)     │
│  - Platform (CrashReporter, Theme, RuntimeDownload) │
├─────────────────────────────────────────────────────┤
│  Domain Managers                                    │
│  - AudioManager, VideoManager, SubtitleManager      │
│  - PlaybackStateManager, DomainManager              │
├─────────────────────────────────────────────────────┤
│  Core Infrastructure                                │
│  - EventBus, NavigationService, InputRouting        │
│  - Feature Toggles, Licensing                       │
│  - Storage (Settings, Audio, Subtitle, Playlist)    │
├─────────────────────────────────────────────────────┤
│  Media Layer (Interfaces + Implementations)         │
│  - IMediaPlayer, IPlaybackControl, IAudioControl    │
│  - IVideoControl, ISubtitleControl, etc.            │
│  - MpvPlayer, MediaFoundationPlayer                 │
│  - Codec providers (MF, mpv, SoftwareFallback)      │
├─────────────────────────────────────────────────────┤
│  Core Layer (Config, Logging, Models)               │
│  - IConfigService, ILoggingService                  │
│  - AppSettings, FileLogger                          │
└─────────────────────────────────────────────────────┘
```

### 4.2 Proposed React Native Architecture

```
┌─────────────────────────────────────────────────────┐
│  Screens (React Native Components)                  │
│  - PlayerScreen, StartScreen                        │
│  - Components (ControlsBar, SeekBar, HeaderBar...)  │
│  - Modals (Playlist, AudioTracks, Subtitles...)     │
├─────────────────────────────────────────────────────┤
│  ViewModels / Hooks                                 │
│  - usePlayer (playback state, controls)             │
│  - useAudio (audio tracks, volume, equalizer)       │
│  - useVideo (video tracks, filters, zoom, crop)     │
│  - useSubtitles (subtitle tracks, styling, sync)    │
│  - usePlaylist (playlist management, shuffle, loop) │
├─────────────────────────────────────────────────────┤
│  Services                                           │
│  - MediaService (wraps RN Video player)             │
│  - FileService (file picker, file metadata)         │
│  - PersistenceService (AsyncStorage / MMKV)         │
│  - LoggingService (console + optional remote)       │
├─────────────────────────────────────────────────────┤
│  State Management (Context / Redux Toolkit)           │
│  - PlayerStore (playback state, position, volume)   │
│  - SettingsStore (app settings, preferences)        │
│  - PlaylistStore (current playlist, history)        │
│  - FeatureStore (feature toggles, license state)    │
├─────────────────────────────────────────────────────┤
│  Native Modules (core to the architecture)          │
│  - MpvBridgeModule (Turbo Module — mpv JNI bridge)  │
│  - MpvRenderView (Fabric component — SurfaceView)   │
│  - Audio Routing (WASAPI equivalent)                │
│  - File System Access                               │
└─────────────────────────────────────────────────────┘
```

---

## 5. Detailed Component Inventory

### 5.1 View Layer (Avalonia XAML)

#### Pages
| Desktop Page | React Native Screen | Complexity |
|---|---|---|
| [PlayerPage.axaml](file:///x:/Development/Cine_CSharp_DotNet/src/App/Views/Pages/PlayerPage.axaml) | `PlayerScreen.tsx` — Video surface + all overlay components | ★★★★★ |
| [StartPage.axaml](file:///x:/Development/Cine_CSharp_DotNet/src/App/Views/Pages/StartPage.axaml) | `StartScreen.tsx` — Recent files, branding, glass-morphism UI | ★★★★☆ |

#### Shell
| Desktop Shell | React Native Equivalent | Notes |
|---|---|---|
| [MainWindow.axaml](file:///x:/Development/Cine_CSharp_DotNet/src/App/Views/Shell/MainWindow.axaml) | Root Navigator (Stack + Tab) | Custom window chrome not needed on mobile |

#### Components — Chrome
| Desktop Component | RN Component | Notes |
|---|---|---|
| ControlsBox.axaml | `ControlsBar.tsx` | Transport buttons, volume, menus |
| HeaderBar.axaml | `HeaderBar.tsx` | Title, menus |
| FullscreenHeader.axaml | `FullscreenHeader.tsx` | Fullscreen mode header |
| TrialBanner.axaml | `TrialBanner.tsx` | Licensing trial notice |

#### Components — Overlays
| Desktop Component | RN Component | Notes |
|---|---|---|
| NowPlayingInfo.axaml | `NowPlayingInfo.tsx` | Current track info overlay |
| OsdNotification.axaml | `OsdNotification.tsx` | Animated toast/snackbar |
| PauseOverlay.axaml | `PauseOverlay.tsx` | Pause indicator |
| ReplayOverlay.axaml | `ReplayOverlay.tsx` | Replay button at EOF |
| SpinnerOverlay.axaml | `SpinnerOverlay.tsx` | Loading spinner |

#### Components — Panels
| Desktop Panel | RN Component | Notes |
|---|---|---|
| VolumePanel.axaml | `VolumeModal.tsx` | Slider + mute toggle |
| AudioTrackPanel.axaml | `AudioTrackModal.tsx` | Track list + delay setting |
| SubtitlePanel.axaml | `SubtitleModal.tsx` | Track list + styling options |
| ChaptersPanel.axaml | `ChaptersModal.tsx` | Chapter list with timestamps |
| PlaylistPanel.axaml | `PlaylistModal.tsx` | Playlist management |
| EqualizerPanel.axaml | `EqualizerModal.tsx` | 10-band equalizer |
| OpenMenuPanel.axaml | `OpenMenuModal.tsx` | Open file / URL options |
| PrimaryMenuPanel.axaml | `SettingsModal.tsx` | Main menu with settings |

#### Components — Media
| Desktop Media Component | RN Component | Notes |
|---|---|---|
| SeekBar.axaml | `SeekBar.tsx` | Custom slider with chapter markers |
| TrackFlyoutBuilder.cs | TrackSelector | Used for track selection menus |

#### Dialogs
| Desktop Dialog | RN Dialog | Notes |
|---|---|---|
| PreferencesDialog.axaml | `PreferencesScreen.tsx` | Settings screen |
| PreferencesWindow.axaml | — | Merged into PreferencesScreen |
| CommandPaletteDialog.axaml | — | Not applicable (desktop keyboard feature) |
| KeyboardShortcutsDialog.axaml | — | Not applicable on mobile |
| PipWindow.axaml | PiP via native API | Picture-in-Picture |
| FirstLaunchDialog.axaml | `FirstLaunchScreen.tsx` | First-run experience |
| PlaylistDialog.axaml | `PlaylistModal.tsx` | Playlist management |
| SubtitleSettingsDialog.axaml | `SubtitleSettingsScreen.tsx` | Subtitle customization |

### 5.2 ViewModel Layer

| Desktop ViewModel | React Native Equivalent | Key Responsibilities |
|---|---|---|
| [MainViewModel.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/ViewModels/Shell/MainViewModel.cs) | `usePlayer` hook + partial hooks | Central playback state, commands, property bindings |
| MainViewModel.Actions.cs | `usePlayerActions` | Open/add files, command execution |
| MainViewModel.Playback.cs | `usePlayerPlayback` | Play/pause/stop/seek/speed |
| MainViewModel.Playlist.cs | `usePlaylist` | Playlist management |
| MainViewModel.Renderer.cs | — | Desktop-specific rendering logic |
| MainViewModel.Tracks.cs | `useTrackSelection` | Audio/video/subtitle track selection |
| MainViewModel.Video.cs | `useVideoControls` | Video filters, zoom, crop |
| StartPageViewModel.cs | `useStartPage` | Recent files, branding |

---

## 6. Media Playback Engine

### 6.1 Desktop Media Layer Architecture

```
IMediaPlayer (aggregate interface)
├── IPlaybackControl — Open, Play, Pause, Stop, Seek, Speed, Screenshot
├── IAudioControl — Volume, Mute, Audio Delay, Audio Device
├── IVideoControl — Zoom, Aspect Ratio, Contrast, Brightness, Gamma, Saturation, Hue, Crop
├── ISubtitleControl — Subtitle track, Delay, Position, Font, Color, Opacity, etc.
├── IChapterNavigation — Chapter list, Next/Prev chapter
├── IPlaylistManagement — Playlist, Next/Prev, Shuffle, Loop
└── Low-level — InitializeRenderer, Command, RenderFrame
```

### 6.2 Desktop Implementations

| Implementation | Status | Notes |
|---|---|---|
| **MpvPlayer** (primary) | Complete | Full mpv bindings via P/Invoke. Render API (OpenGL via mpv_render_context) |
| **MediaFoundationPlayer** (fallback) | Partial | Windows MF Source Reader + D3D11 rendering |
| **SoftwareFallbackCodecProvider** | Stub | Incomplete |

### 6.3 Custom mpv Integration (the chosen approach)

**No third-party React Native video packages are used.** The mobile app integrates libmpv directly via a custom Turbo Module + JNI bridge — mirroring the desktop's own mpv integration.

### 6.4 Custom Architecture: React Native CLI + mpv (Android)

```
React Native App (TypeScript)
┌──────────────────────────────────────────────┐
│  <MpvVideoView source="..." />                │
│  useMpvPlayer() hook                          │
└──────────────┬───────────────────────────────┘
               │ JSI (direct calls, no JSON serialization)
┌──────────────┴───────────────────────────────┐
│  Turbo Module: C++ Spec (Codegen-generated)   │
│  MpvPlayerSpec.h                              │
│  - play(), pause(), seekTo(), setSpeed()      │
│  - setVolume(), setAudioTrack()               │
│  - setVideoFilters(), setSubtitleTrack()       │
│  - getChapters(), screenshot()                │
└──────────────┬───────────────────────────────┘
               │ JNI (C++ → Kotlin)
┌──────────────┴───────────────────────────────┐
│  Android Native Layer (Kotlin + C++ JNI)      │
│  ┌─────────────────────────────────────────┐  │
│  │  MpvBridgeModule.kt (TurboModule impl)   │  │
│  │  │  Delegates all calls to MPVLib       │  │
│  │  └── MPVLib.command("loadfile", ...)    │  │
│  ├─────────────────────────────────────────┤  │
│  │  MPVLib.kt (JNI declarations)           │  │
│  │  │  external fun command(vararg cmd)    │  │
│  │  │  external fun setPropertyString()    │  │
│  │  │  external fun getPropertyDouble()    │  │
│  │  │  external fun attachSurface()        │  │
│  ├─────────────────────────────────────────┤  │
│  │  MpvRenderView.kt (Fabric native view)  │  │
│  │  │  SurfaceView + mpv rendering         │  │
│  │  │  Gesture handling (tap, swipe, pinch)│  │
│  └─────────────────────────────────────────┘  │
└──────────────┬───────────────────────────────┘
               │ System.loadLibrary("mpv")
               │ System.loadLibrary("player")
┌──────────────┴───────────────────────────────┐
│  Native .so libraries (prebuilt)              │
│  jniLibs/                                     │
│  ├── arm64-v8a/libmpv.so  (mpv core)         │
│  ├── arm64-v8a/libplayer.so (JNI bridge)     │
│  ├── armeabi-v7a/libmpv.so                   │
│  └── armeabi-v7a/libplayer.so                │
└──────────────────────────────────────────────┘
```

### 6.5 How It Works: Layer by Layer

#### Layer 1: Prebuilt libmpv.so for Android

The [mpv-android build scripts](https://github.com/mpv-android/mpv-android) compile libmpv with FFmpeg for Android NDK:

```bash
# Requires Linux or macOS (not Windows)
git clone https://github.com/mpv-android/mpv-android
cd mpv-android/buildscripts
./download.sh                          # Install SDK, NDK, dependencies
./buildall.sh --arch arm64 mpv         # Build for arm64-v8a
./buildall.sh --arch arm64 ffmpeg      # Build FFmpeg codecs
./buildall.sh -n                       # Build JNI bridge → libplayer.so
```

**Output** (in `prefix/arm64/lib/`):
- `libmpv.so` — mpv core player
- `libavcodec.so`, `libavformat.so`, `libavutil.so` — FFmpeg
- `libswresample.so`, `libswscale.so` — audio/video processing
- `libplayer.so` — JNI bridge (compiled from C++)

Hardware decoding is handled by mpv's `mediacodec` hwdec backend, using Android's MediaCodec API.

#### Layer 2: JNI Bridge (C++)

The JNI layer wraps the mpv C API (`mpv_*` functions) into callable Java methods. This is the same architecture used by [aniyomi-mpv-lib](https://deepwiki.com/aniyomiorg/aniyomi-mpv-lib/4-jni-bridge-layer):

```
jni/
├── main.cpp        →  lifecycle: create/init/destroy, command()
├── property.cpp    →  get/set/observe properties of all types
├── event.cpp       →  event polling thread, dispatches to Java observers
└── jni_utils.cpp   →  JVM environment management, method caching
```

Key C++ functions:

```cpp
static mpv_handle *g_mpv = nullptr;

// Lifecycle
extern "C" void Java_is_xyz_mpv_MPVLib_create(JNIEnv*, jclass, jobject ctx) {
    g_mpv = mpv_create();
    mpv_set_option_string(g_mpv, "vo", "gpu");
    mpv_set_option_string(g_mpv, "gpu-context", "android");
    mpv_set_option_string(g_mpv, "hwdec", "mediacodec");
}

// Commands (play, pause, seek, loadfile, etc.)
extern "C" void Java_is_xyz_mpv_MPVLib_command(JNIEnv*, jclass, jobjectArray args) {
    // Convert Java String[] → char** → mpv_command()
    mpv_command(g_mpv, c_args);
}
```

#### Layer 3: Kotlin MPVLib Wrapper

Directly reuses the existing [MPVLib.kt](https://github.com/iCoder2025/mpv-android-lib/blob/main/app/src/main/java/is/xyz/mpv/MPVLib.kt) interface:

```kotlin
object MPVLib {
    init {
        System.loadLibrary("mpv")    // Load libmpv.so first
        System.loadLibrary("player") // Then libplayer.so (JNI bridge)
    }

    external fun create(appctx: Context)
    external fun init()
    external fun destroy()
    external fun attachSurface(surface: Surface)
    external fun detachSurface()
    external fun command(vararg cmd: String)
    external fun setPropertyString(name: String, value: String): Int
    external fun getPropertyDouble(property: String): Double?
    external fun getPropertyInt(property: String): Int?
    external fun getPropertyString(property: String): String?
    external fun observeProperty(property: String, format: Int)
    // + event observers, property flows, screenshot, etc.
}
```

#### Layer 4: React Native Turbo Module (Kotlin)

The Turbo Module bridges mpv commands from JavaScript to the native layer:

```kotlin
class MpvBridgeModule(reactContext: ReactApplicationContext) :
    NativeMpvPlayerSpec(reactContext) {

    override fun openFile(path: String) {
        MPVLib.command("loadfile", path, "replace")
    }

    override fun play() {
        MPVLib.setPropertyString("pause", "no")
    }

    override fun pause() {
        MPVLib.setPropertyString("pause", "yes")
    }

    override fun seekTo(time: Double) {
        MPVLib.command("seek", time.toInt().toString(), "absolute")
    }

    override fun setSpeed(speed: Double) {
        MPVLib.setPropertyDouble("speed", speed)
    }

    override fun setVolume(volume: Double) {
        MPVLib.setPropertyDouble("volume", volume)
    }

    override fun setSubtitleTrack(index: Double) {
        MPVLib.setPropertyInt("sid", index.toInt())
    }

    override fun setAudioTrack(index: Double) {
        MPVLib.setPropertyInt("aid", index.toInt())
    }

    override fun setVideoFilters(filters: ReadableMap) {
        val vf = buildString {
            filters.getDouble("brightness")?.let { append("brightness=$it:") }
            filters.getDouble("contrast")?.let { append("contrast=$it:") }
            filters.getDouble("gamma")?.let { append("gamma=$it:") }
            filters.getDouble("saturation")?.let { append("saturation=$it:") }
            filters.getDouble("hue")?.let { append("hue=$it:") }
        }
        MPVLib.command("vf", "set", vf.trimEnd(':'))
    }

    // All other interfaces (chapters, subtitles, audio delay, screenshots, etc.)
    // are delegated to MPVLib in the same pattern.
}
```

#### Layer 5: Fabric Native View (SurfaceView)

The video surface is rendered via a custom Fabric component wrapping Android's `SurfaceView`:

```kotlin
class MpvRenderView(context: ThemedReactContext) :
    SurfaceView(context), SurfaceHolder.Callback {

    init { holder.addCallback(this) }

    override fun surfaceCreated(holder: SurfaceHolder) {
        MPVLib.attachSurface(holder.surface)
    }

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        MPVLib.detachSurface()
    }

    override fun surfaceChanged(h: SurfaceHolder, fmt: Int, w: Int, h: Int) {
        // mpv adapts automatically
    }
}
```

#### Layer 6: TypeScript Turbo Module Spec

```typescript
import { TurboModule, TurboModuleRegistry } from 'react-native';
import type { Double } from 'react-native/Libraries/Types/CodegenTypes';

export interface AudioTrack {
  id: string; lang: string; title: string; default: boolean;
}
export interface SubtitleTrack {
  id: string; lang: string; title: string; encoding: string;
}
export interface Chapter {
  title: string; time: Double;
}
export interface PlaybackState {
  position: Double; duration: Double; isPlaying: boolean;
  speed: Double; volume: Double;
}
export interface VideoFilters {
  brightness?: Double; contrast?: Double; gamma?: Double;
  saturation?: Double; hue?: Double;
}

export interface Spec extends TurboModule {
  // Lifecycle
  create(): void; destroy(): void;
  attachSurface(surfaceId: Double): void; detachSurface(): void;

  // IPlaybackControl equivalent
  openFile(path: string): void; openUrl(url: string): void;
  play(): void; pause(): void; stop(): void;
  seekTo(time: Double): void; seekBy(offset: Double): void;
  setSpeed(speed: Double): void; screenshot(): Promise<string>;

  // IAudioControl equivalent
  setVolume(volume: Double): void; setMute(muted: boolean): void;
  setAudioDelay(delay: Double): void; setAudioTrack(index: Double): void;

  // IVideoControl equivalent
  setZoom(zoom: Double): void; setAspectRatio(ratio: string): void;
  setVideoFilters(filters: VideoFilters): void;

  // ISubtitleControl equivalent
  setSubtitleTrack(index: Double): void; setSubtitleDelay(delay: Double): void;
  setSubtitlePosition(position: Double): void;
  addSubtitle(path: string): void; removeSubtitle(index: Double): void;

  // IChapterNavigation equivalent
  getChapters(): Promise<Chapter[]>; seekChapter(index: Double): void;

  // Query
  getPropertyString(name: string): Promise<string>;
  getPropertyDouble(name: string): Promise<Double>;
  getPlaybackInfo(): Promise<PlaybackState>;
  getAudioTracks(): Promise<AudioTrack[]>;
  getSubtitleTracks(): Promise<SubtitleTrack[]>;
}

export default TurboModuleRegistry.get<Spec>('NativeMpvPlayer');
```

### 6.6 Desktop → Mobile Interface Mapping

| Desktop Interface | Turbo Module Methods | mpv Property/Command |
|---|---|---|
| `IPlaybackControl.Open(file)` | `openFile(path)` | `loadfile <path> replace` |
| `IPlaybackControl.Play()` | `play()` | `set pause=no` |
| `IPlaybackControl.Pause()` | `pause()` | `set pause=yes` |
| `IPlaybackControl.Stop()` | `stop()` | `stop` |
| `IPlaybackControl.Seek(pos)` | `seekTo(time)` | `seek <time> absolute` |
| `IPlaybackControl.SetSpeed(s)` | `setSpeed(speed)` | `set speed=<s>` |
| `IPlaybackControl.Screenshot()` | `screenshot()` | `screenshot-raw` |
| `IAudioControl.SetVolume(v)` | `setVolume(vol)` | `set volume=<v>` |
| `IAudioControl.SetMute(m)` | `setMute(muted)` | `set mute=<m>` |
| `IAudioControl.SetAudioDelay(d)` | `setAudioDelay(delay)` | `set audio-delay=<d>` |
| `IAudioControl.SetAudioTrack(i)` | `setAudioTrack(index)` | `set aid=<i>` |
| `IVideoControl.SetZoom(z)` | `setZoom(zoom)` | `set video-zoom=<z>` |
| `IVideoControl.SetAspectRatio(r)` | `setAspectRatio(ratio)` | `set video-aspect=<r>` |
| `IVideoControl.SetVideoFilters(f)` | `setVideoFilters(filters)` | `vf set ...` |
| `ISubtitleControl.SetSubTrack(i)` | `setSubtitleTrack(index)` | `set sid=<i>` |
| `ISubtitleControl.SetSubDelay(d)` | `setSubtitleDelay(delay)` | `set sub-delay=<d>` |
| `ISubtitleControl.SetSubPosition(p)` | `setSubtitlePosition(pos)` | `set sub-pos=<p>` |
| `ISubtitleControl.AddSubtitle(p)` | `addSubtitle(path)` | `sub-add <path>` |
| `IChapterNavigation.GetChapters()` | `getChapters()` | `chapter-list` property |
| `IChapterNavigation.SeekChapter(i)` | `seekChapter(index)` | `seek <ch> absolute-percent` |

### 6.7 React Native Hook Layer

All mpv commands are wrapped in a TypeScript hook, mirroring the desktop's ViewModel pattern:

```typescript
function useMpvPlayer() {
  const player = NativeMpvPlayer;

  return {
    // IPlaybackControl
    play: () => player.play(),
    pause: () => player.pause(),
    seekTo: (t: number) => player.seekTo(t),
    setSpeed: (s: number) => player.setSpeed(s),

    // IAudioControl
    setVolume: (v: number) => player.setVolume(v),
    setAudioTrack: (idx: number) => player.setAudioTrack(idx),

    // IVideoControl
    setVideoFilters: (f: VideoFilters) => player.setVideoFilters(f),

    // ISubtitleControl
    setSubtitleTrack: (idx: number) => player.setSubtitleTrack(idx),
    addSubtitle: (path: string) => player.addSubtitle(path),

    // IChapterNavigation
    getChapters: () => player.getChapters(),
  };
}
```

### 6.8 Required Reference Repositories

| Repository | Purpose |
|---|---|
| [mpv-android/buildscripts](https://github.com/mpv-android/mpv-android) | Build libmpv.so for Android |
| [mpv-android-lib (MPVLib.kt)](https://github.com/iCoder2025/mpv-android-lib) | Reusable JNI Kotlin wrapper |
| [aniyomi-mpv-lib (JNI layer)](https://deepwiki.com/aniyomiorg/aniyomi-mpv-lib/4-jni-bridge-layer) | C++ JNI bridge implementation details |
| [react-native-cpp-turbo](https://github.com/jahskee/react-native-cpp-turbo) | C++ Turbo Module template |

---

## 7. State Management & Persistence

### 7.1 Desktop State Management

| Pattern | Usage |
|---|---|
| MVVM + INotifyPropertyChanged | MainViewModel properties bound to XAML |
| EventBus | Cross-component communication (IEventBus) |
| DomainManager<T> | Wraps player interfaces for typed access |
| PlaybackStateManager | Unified playback state |
| ObservableCollection<T> | Track lists, playlists, chapters |

### 7.2 Recommended React Native State Management

| Library | Purpose |
|---|---|
| **Redux Toolkit** (Chosen) | Central store for player state, playlist, settings — with typed hooks (`useAppDispatch`, `useAppSelector`) |
| **React Context** | Theme, feature flags, auth/license |
| **AsyncStorage / MMKV** | Persistence (session, settings, recent files) via `redux-persist` |
| **Custom hooks** | Encapsulate player logic (usePlayer, useAudio, etc.) — wrap Redux dispatch/selectors |

### 7.3 Proposed Store Structure

```typescript
// PlayerStore (Redux slice)
interface PlayerState {
  // Playback
  isPlaying: boolean;
  isPaused: boolean;
  position: number; // seconds
  duration: number;
  speed: number;
  volume: number;
  isMuted: boolean;

  // Tracks
  audioTracks: AudioTrack[];
  videoTracks: VideoTrack[];
  subtitleTracks: SubtitleTrack[];
  selectedAudioTrack: number;
  selectedVideoTrack: number;
  selectedSubtitleTrack: number | null;

  // Playlist
  playlist: PlaylistItem[];
  currentIndex: number;
  isShuffled: boolean;
  loopMode: 'none' | 'file' | 'playlist';

  // Actions
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setSpeed: (speed: number) => void;
  // ... more actions
}

// SettingsStore
interface SettingsState {
  subtitleFontSize: number;
  subtitleFontFamily: string;
  subtitleColor: string;
  subtitleOpacity: number;
  // ...
}
```

### 7.4 Persistence Strategy

| Desktop Service | React Native Persistence |
|---|---|
| ISessionService → `SessionData` | MMKV: `@cine/session` |
| IRecentFilesService → recent files list | MMKV: `@cine/recent-files` |
| IPlaylistService → playlist data | MMKV: `@cine/playlist` |
| IConfigService → `AppSettings` | MMKV: `@cine/settings` |
| AudioSettingsStore | MMKV: `@cine/audio-settings` |
| SubtitleSettingsStore | MMKV: `@cine/subtitle-settings` |
| PlaylistSettingsStore | MMKV: `@cine/playlist-settings` |

---

## 8. UI Component Breakdown

### 8.1 Theming & Design Tokens

The desktop app uses a comprehensive design token system:

| Desktop Resource | React Native Equivalent |
|---|---|
| [Colors.axaml](file:///x:/Development/Cine_CSharp_DotNet/src/App/Views/Resources/Colors.axaml) + [Colors.json](file:///x:/Development/Cine_CSharp_DotNet/src/App/Views/Resources/Colors.json) | `theme/colors.ts` |
| [Typography.axaml](file:///x:/Development/Cine_CSharp_DotNet/src/App/Views/Resources/Typography.axaml) | `theme/typography.ts` |
| [Spacing.axaml](file:///x:/Development/Cine_CSharp_DotNet/src/App/Views/Resources/Spacing.axaml) | `theme/spacing.ts` |
| [Sizes.axaml](file:///x:/Development/Cine_CSharp_DotNet/src/App/Views/Resources/Sizes.axaml) | `theme/sizes.ts` |
| [Radius.axaml](file:///x:/Development/Cine_CSharp_DotNet/src/App/Views/Resources/Radius.axaml) | `theme/borderRadius.ts` |
| [Elevation.axaml](file:///x:/Development/Cine_CSharp_DotNet/src/App/Views/Resources/Elevation.axaml) | `theme/shadow.ts` |
| [Motion.axaml](file:///x:/Development/Cine_CSharp_DotNet/src/App/Views/Resources/Motion.axaml) | `theme/animations.ts` |
| [Icons.axaml](file:///x:/Development/Cine_CSharp_DotNet/src/App/Views/Resources/Icons.axaml) | MaterialIcons via react-native-vector-icons |
| [Token.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Views/Resources/Token.cs) + [AppColors.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Views/Resources/AppColors.cs) | Token constants |
| [UiConstants.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Views/Resources/UiConstants.cs) | Layout constants |

### 8.2 UI Design Highlights

The desktop app features a **dark, glass-morphism design** with:

- **Fluent Design-inspired** theme
- **Custom window chrome** (no title bar, rounded corners, custom resize grips)
- **Acrylic/glass backgrounds** with blur effects
- **Smooth transitions** and motion design
- **Animated overlays** (OSD, pause, replay, spinner)
- **Start page** with brand panel, recent files grid, "open file" CTA

### 8.3 Layout Structure

```
MainWindow
├── ContentClip (rounded corner container)
│   ├── PlaybackBackground (radial gradient)
│   ├── PlayerPage
│   │   ├── MpvVideoView (video surface)
│   │   ├── VideoClickOverlay (gesture capture)
│   │   ├── TrialWatermark
│   │   ├── SpinnerOverlay
│   │   ├── PauseOverlay
│   │   ├── ChapterBadge
│   │   ├── ReplayOverlay
│   │   ├── HeaderBar / FullscreenHeader
│   │   ├── ControlsBox
│   │   │   ├── TrialBanner
│   │   │   ├── SeekBar (with chapter markers)
│   │   │   └── Transport buttons
│   │   ├── NowPlayingInfo
│   │   └── OsdNotification
│   └── StartPage (initially on top, fades out)
├── PanelOverlayHost
│   ├── PanelDismissBackground
│   ├── OpenMenuPanel
│   ├── PrimaryMenuPanel
│   ├── VolumePanel
│   ├── SubtitlePanel
│   ├── AudioTrackPanel
│   ├── ChaptersPanel
│   ├── PlaylistPanel
│   └── EqualizerPanel
├── WindowFrame (2px accent border)
└── ResizeGripPanel (invisible resize handles)
```

---

## 9. Feature Toggle & Licensing System

### 9.1 Desktop Feature System

The desktop uses a JSON-defined feature toggle system with license-based gating:

- **Feature definitions**: [feature-definitions.json](file:///x:/Development/Cine_CSharp_DotNet/src/App/Features/feature-definitions.json)
- **Feature keys**: [FeatureKeys.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Features/FeatureKeys.cs)
- **Service**: [FeatureService.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Features/FeatureService.cs)
- **Licensing tiers**: Trial → Free → Full → Pro

### 9.2 Licensed Features

| Feature Key | Required Tier | Notes |
|---|---|---|
| `playback.4k` | Full | 4K resolution support |
| `playback.8k` | Pro | 8K resolution support |
| `playback.hdr` | Full | HDR video output |
| `codecs.hdr10` | Pro | HDR10 codec |
| `codecs.dolbyVision` | Pro | Dolby Vision codec |
| `codecs.dts` | Full | DTS/DTS-HD audio |
| `codecs.truehd` | Pro | Dolby TrueHD audio |
| `audio.equalizer` | Full | 10-band equalizer |
| `audio.deviceExclusive` | Pro | Exclusive WASAPI mode |
| `video.shaders` | Pro | Custom mpv shaders |
| `video.filters.advanced` | Full | Deband, denoise, sharpen |
| `subtitles.advancedStyling` | Full | Font/shadow/blur styling |
| `playlist.saveLoad` | Full | Playlist persistence |
| `ui.pipMode` | Full | Picture-in-Picture |
| `ui.crashReporting` | Free | Crash telemetry |
| `ui.trialWatermark` | Free | Trial overlay |

### 9.3 React Native Strategy

```typescript
// Feature definitions (JSON)
const FEATURES = {
  'playback.4k': { tier: 'full', default: true },
  'audio.equalizer': { tier: 'full', default: true },
  'ui.pipMode': { tier: 'full', default: true },
  // ...
};

// License tiers
type LicenseTier = 'trial' | 'free' | 'full' | 'pro';

// Feature check hook
function useFeature(key: string): boolean {
  const { tier } = useLicense();
  const feature = FEATURES[key];
  return compareTiers(tier, feature.tier);
}
```

---

## 10. Navigation & Routing

### 10.1 Desktop Navigation

The desktop app uses a simple `INavigationService` with two "pages":

| Route | View | Description |
|---|---|---|
| `StartPage` | StartPage | Recent files, brand, open CTA |
| `PlayerPage` | PlayerPage | Video playback with all controls |

**Navigation pattern**: The StartPage sits on top of the PlayerPage in the same window. When a file is opened, StartPage fades out revealing the PlayerPage beneath it.

### 10.2 React Native Navigation

```typescript
// Stack Navigator
<Stack.Navigator>
  <Stack.Screen name="Start" component={StartScreen} />
  <Stack.Screen name="Player" component={PlayerScreen} />
  <Stack.Screen name="Preferences" component={PreferencesScreen} />
  <Stack.Screen name="SubtitleSettings" component={SubtitleSettingsScreen} />
</Stack.Navigator>
```

---

## 11. Services Reference

### 11.1 Media Services

| Desktop Service | Interface | React Native Equivalent |
|---|---|---|
| [PlayerService.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/Media/PlayerService.cs) | — (wraps IMediaPlayer) | `MediaService.ts` — wraps RN Video ref |
| [CodecManager.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/Media/CodecManager.cs) | — | Not needed (handled by OS player) |
| [CodecPluginLoader.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/Media/CodecPluginLoader.cs) | — | Not needed |
| [RendererCoordinator.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/Media/RendererCoordinator.cs) | IRendererService | Not needed (RN handles rendering) |
| [RenderThrottleService.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/Media/RenderThrottleService.cs) | — | Not needed |
| [IAudioManager.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/Media/IAudioManager.cs) | IAudioManager | `useAudio` hook |
| [ISubtitleManager.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/Media/ISubtitleManager.cs) | ISubtitleManager | `useSubtitles` hook |
| [IMediaFileService.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/Media/IMediaFileService.cs) | IMediaFileService | `MediaFileService.ts` |

### 11.2 Persistence Services

| Desktop Service | Interface | React Native Equivalent |
|---|---|---|
| [SessionManager.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/Persistence/SessionManager.cs) | ISessionService | `sessionService.ts` (MMKV) |
| [RecentFilesService.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/Persistence/RecentFilesService.cs) | IRecentFilesService | `recentFilesService.ts` (MMKV) |
| [PlaylistCoordinator.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/Persistence/PlaylistCoordinator.cs) | IPlaylistService | `playlistService.ts` (MMKV) |
| [PlaylistDialogHelpers.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/Persistence/PlaylistDialogHelpers.cs) | — | Not needed |
| [ResumeService.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/Persistence/ResumeService.cs) | — | Merged with session |
| [StartupTimer.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/Persistence/StartupTimer.cs) | — | Not needed |

### 11.3 UI Services

| Desktop Service | Interface | React Native Equivalent |
|---|---|---|
| [OsdService.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/UI/OsdService.cs) | IOsdService | `OsdNotification` component |
| [DragDropService.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/UI/DragDropService.cs) | IDragDropService | Not needed on mobile |
| [IFileDialogService.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/UI/IFileDialogService.cs) | IFileDialogService | `react-native-document-picker` |
| [PipService.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/UI/PipService.cs) | IPipService | Native PiP API |
| [ThemeService.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/UI/ThemeService.cs) | IThemeService | Theme context (dark mode) |
| [TaskBarService.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/UI/TaskBarService.cs) | — | Not needed on mobile |

### 11.4 Platform / Infrastructure Services

| Desktop Service | Interface | React Native Equivalent |
|---|---|---|
| [CrashReporterService.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/Platform/CrashReporterService.cs) | — | Crashlytics / Sentry |
| [RunTimeDownloadService.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Services/Platform/RunTimeDownloadService.cs) | — | Not needed |
| [StartupManager.cs](file:///x:/Development/Cine_CSharp_DotNet/src/Core/Startup/StartupManager.cs) | IStartupManager | App entry point setup |
| [EventBus.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Core/EventBus/EventBus.cs) | IEventBus | Redux subscribe / React context |
| [NavigationService.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Core/Navigation/NavigationService.cs) | INavigationService | React Navigation |
| [InputRoutingService.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Core/Input/InputRoutingService.cs) | IInputRoutingService | Gesture handlers (not needed) |

### 11.5 Storage Services

| Desktop Storage | React Native Equivalent |
|---|---|
| [SettingsStore.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Storage/SettingsStore.cs) | `settingsSlice.ts` (Redux Toolkit + redux-persist) |
| [AudioSettingsStore.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Storage/AudioSettingsStore.cs) | Part of SettingsStore |
| [SubtitleSettingsStore.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Storage/SubtitleSettingsStore.cs) | Part of SettingsStore |
| [PlaylistSettingsStore.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Storage/PlaylistSettingsStore.cs) | Part of SettingsStore |
| [MpvSettingsStore.cs](file:///x:/Development/Cine_CSharp_DotNet/src/App/Storage/MpvSettingsStore.cs) | Not needed |

---

## 12. Mobile-Specific Considerations

### 12.1 Platform Differences

| Aspect | Desktop (Windows) | Mobile (Android/iOS) |
|---|---|---|
| **File Access** | Full NTFS access | Sandboxed; SAF (Android) / File app (iOS) |
| **Codecs** | libmpv with software fallback | OS media framework (Media3/AVFoundation) |
| **Video Rendering** | ANGLE/OpenGL ES → custom render target | Native SurfaceView/TextureView |
| **Audio Routing** | WASAPI exclusive/shared | OS-managed audio focus |
| **Subtitle Rendering** | mpv text overlay | Custom JS overlay components |
| **Background Playback** | Always active | Must use "audio mode" and foreground service |
| **Window Management** | Multiple windows, PiP separate window | Single window, PiP via system API |
| **Input** | Keyboard + mouse | Touch gestures (tap, swipe, pinch) |
| **Memory** | 8+ GB typical | 2-6 GB (constrained) |
| **Storage** | TB-scale HDD/SSD | Internal + limited external |

### 12.2 Gesture Map (Desktop → Mobile)

| Desktop Action | Mobile Gesture |
|---|---|
| Click Play/Pause | Tap screen center |
| Click Seek Bar | Drag seek bar thumb |
| Volume Wheel | Volume rocker buttons |
| Previous/Next track | Swipe left/right (or buttons) |
| Fullscreen toggle | Double-tap |
| Context menu | Long press |
| Zoom | Pinch-to-zoom |
| Seek (arrow keys) | Double-tap left/right edge |

### 12.3 Touch-Optimized Controls

- **Seek Bar**: Larger touch target (min 44px height)
- **Buttons**: Minimum 48x48dp touch targets
- **Panels**: Bottom sheets instead of side panels
- **Volume**: Phone volume keys by default; in-app slider available
- **Playlist**: Full-screen modal with drag-to-reorder

### 12.4 Performance Considerations

| Concern | Mitigation |
|---|---|
| **Large media files** | Progressive download; don't load entire file into memory |
| **Subtitle rendering** | Use native text rendering, not WebViews |
| **Battery consumption** | Pause video when app backgrounds; use hardware decoder |
| **Memory pressure** | Release previous video instances; avoid bitmap leaks |
| **Network streaming** | Support HLS/DASH; adaptive bitrate; buffering config |

---

## 13. Implementation Phases

### Phase 1: Foundation + mpv Integration (Week 1-3)
- [x] Initialize React Native CLI project with TypeScript
- [x] Set up navigation (React Navigation stack)
- [x] Set up state management (Redux Toolkit)
- [x] Set up persistence (redux-persist + AsyncStorage)
- [x] Implement theme system (dark theme)
- [ ] Create StartScreen with recent files
- [ ] **Build libmpv.so for Android** (requires Linux/macOS build environment or WSL2)
- [ ] **Create C++ JNI bridge** (main.cpp, property.cpp, event.cpp)
- [ ] **Create Kotlin MPVLib wrapper** (MPVLib.kt with all JNI declarations)
- [ ] **Create Turbo Module spec** (NativeMpvPlayer.ts — covers all 7 interfaces)
- [ ] **Create MpvBridgeModule.kt** (Turbo Module implementation)
- [ ] **Create MpvRenderView.kt** (Fabric component + SurfaceView)
- [ ] **Integrate mpv lifecycle** (create/init/destroy in app startup)
- [ ] **Create PlayerScreen** with custom MpvVideoView native component

### Phase 2: Core Playback (Week 3-4)
- [ ] Play/Pause/Stop/Seek controls
- [ ] Volume control
- [ ] Playback speed
- [ ] Seek bar with progress tracking
- [ ] ControlsBar component with auto-hide
- [ ] Landscape fullscreen support
- [ ] File picker integration

### Phase 3: Tracks & Subtitles (Week 5-6)
- [ ] Audio track selection
- [ ] Video track selection
- [ ] Subtitle track selection
- [ ] External subtitle file loading
- [ ] Subtitle display overlay
- [ ] Subtitle styling (font, size, color, position)
- [ ] Subtitle sync (delay adjustment)

### Phase 4: Playlist & Sessions (Week 7-8)
- [ ] Playlist management (add, remove, reorder)
- [ ] Next/Previous track
- [ ] Shuffle + Loop modes
- [ ] Session save/restore
- [ ] Recent files tracking
- [ ] Chapter navigation

### Phase 5: Advanced Features (Week 9-10)
- [ ] Video filters (brightness, contrast, saturation, gamma)
- [ ] Zoom + Aspect ratio controls
- [ ] Screenshot capture
- [ ] Picture-in-Picture mode
- [ ] Equalizer (10-band)
- [ ] Audio device selection

### Phase 6: Polish (Week 11-12)
- [ ] Gesture controls (tap, swipe, pinch, double-tap)
- [ ] Animations and transitions
- [ ] OSD notifications
- [ ] Loading states and error handling
- [ ] Network streaming (HLS/DASH)
- [ ] Performance optimization
- [ ] Testing on multiple devices

---

## 14. File Map: Desktop → React Native

```
DESKTOP (Avalonia/C#)                  REACT NATIVE (TypeScript)
═══════════════════════════            ═══════════════════════════

src/App/                               src/
├── Views/                             ├── screens/
│   ├── Shell/MainWindow.axaml         │   ├── RootNavigator.tsx
│   ├── Pages/PlayerPage.axaml         │   ├── PlayerScreen.tsx
│   ├── Pages/StartPage.axaml          │   ├── StartScreen.tsx
│   ├── Components/                    ├── components/
│   │   ├── Chrome/ControlsBox.axaml   │   ├── ControlsBar.tsx
│   │   ├── Chrome/HeaderBar.axaml     │   ├── HeaderBar.tsx
│   │   ├── Overlays/*                 │   ├── overlays/*.tsx
│   │   └── Panels/*                   │   └── panels/*.tsx
│   └── Resources/                     ├── theme/
│       ├── Colors.json                │   └── colors.ts
│       ├── Typography.axaml           │   └── typography.ts
│       └── Token.cs                   │   └── tokens.ts
├── ViewModels/                        ├── hooks/
│   ├── Shell/MainViewModel.cs         │   ├── usePlayer.ts
│   ├── Shell/MainViewModel.*.cs       │   ├── usePlayerActions.ts
│   └── Pages/StartPageViewModel.cs    │   ├── usePlaylist.ts
│                                       │   └── useStartPage.ts
├── Services/                          ├── services/
│   ├── Media/PlayerService.cs         │   ├── mediaService.ts
│   ├── Media/CodecManager.cs          │   ├── codecService.ts
│   ├── Persistence/SessionManager.cs  │   ├── sessionService.ts
│   ├── Persistence/RecentFiles.cs     │   ├── recentFilesService.ts
│   ├── Persistence/PlaylistCoord.cs   │   ├── playlistService.ts
│   ├── UI/OsdService.cs               │   ├── notificationService.ts
│   ├── UI/ThemeService.cs             │   ├── themeService.ts
│   └── Platform/*                     │   └── platform/*
├── Storage/                           ├── stores/
│   ├── SettingsStore.cs               │   ├── settingsStore.ts
│   ├── AudioSettingsStore.cs          │   ├── audioStore.ts
│   ├── SubtitleSettingsStore.cs       │   ├── subtitleStore.ts
│   └── PlaylistSettingsStore.cs       │   └── playlistStore.ts
├── Core/                              ├── lib/
│   ├── DependencyInjection/*          │   ├── container.ts (if needed)
│   ├── EventBus/EventBus.cs           │   ├── eventBus.ts
│   ├── Navigation/NavigationService   │   ├── navigation.ts
│   ├── Input/InputRoutingService      │   └── gestureHandler.ts
│   └── Managers/*                     ├── managers/
│                                       │   ├── audioManager.ts
│                                       │   ├── videoManager.ts
│                                       │   └── subtitleManager.ts
├── Features/                          ├── features/
│   ├── FeatureKeys.cs                 │   ├── featureKeys.ts
│   ├── FeatureService.cs              │   ├── featureService.ts
│   ├── LicensingService.cs            │   ├── licenseService.ts
│   └── feature-definitions.json       │   └── featureDefs.json

src/Media/                             Custom Native Module (cine-mpv/)
├── Interfaces/*                       ├── specs/NativeMpvPlayer.ts (Turbo Spec)
├── Models/*                           ├── android/src/main/java/com/cine/mpv/
└── Implementations/mpv/*              │   ├── MpvBridgeModule.kt (Turbo impl)
                                       │   ├── MPVLib.kt (JNI declarations)
                                       │   └── MpvRenderView.kt (Fabric view)
                                       ├── android/src/main/jni/
                                       │   ├── main.cpp (lifecycle, commands)
                                       │   ├── property.cpp (get/set/observe)
                                       │   ├── event.cpp (event loop)
                                       │   └── jni_utils.cpp
                                       └── android/src/main/jniLibs/
                                           ├── arm64-v8a/libmpv.so
                                           ├── arm64-v8a/libplayer.so
                                           └── armeabi-v7a/libmpv.so
└── Implementations/mediafoundation/*

src/Core/                              src/lib/
├── Config/*                           ├── config.ts
├── Logging/*                          ├── logger.ts
└── Models/*                           └── types/*
```

---

> **Note**: This document serves as a guide for planning the React Native migration. The actual implementation order may vary based on business priorities and resource availability. Each Phase builds on the previous one, so it's recommended to follow them sequentially for a stable foundation.
