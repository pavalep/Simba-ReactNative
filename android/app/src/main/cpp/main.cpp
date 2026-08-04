#include <jni.h>
#include <android/log.h>
#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <pthread.h>
#include <string>
#include <map>
#include <cstring>
#include <dlfcn.h>
#include <client.h>   // mpv

#define LOG_TAG "MpvJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// ── Globals ────────────────────────────────────────────────────────────────

JavaVM *g_vm = nullptr;
mpv_handle *g_mpv = nullptr;
static pthread_t g_eventThread = 0;
volatile bool g_running = false;
volatile bool g_initialized = false;  // true after mpv_initialize()

// Cached Java references
jclass g_cls_MPVLib = nullptr;
jmethodID g_mid_onEvent = nullptr;
jmethodID g_mid_onPropertyChanged = nullptr;
jmethodID g_mid_onError = nullptr;

// ── Forward declarations ──────────────────────────────────────────────────

void eventLoop();

// ── JNI_OnLoad ────────────────────────────────────────────────────────────

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
    g_vm = vm;
    JNIEnv *env;
    if (vm->GetEnv(reinterpret_cast<void **>(&env), JNI_VERSION_1_6) != JNI_OK)
        return JNI_ERR;

    jclass temp = env->FindClass("com/simba/player/mpv/MPVLib");
    if (!temp) {
        LOGE("Failed to find MPVLib class");
        return JNI_ERR;
    }
    g_cls_MPVLib = static_cast<jclass>(env->NewGlobalRef(temp));
    env->DeleteLocalRef(temp);

    g_mid_onEvent = env->GetStaticMethodID(
        g_cls_MPVLib, "onNativeEvent",
        "(Ljava/lang/String;Ljava/lang/String;)V");
    if (!g_mid_onEvent) {
        LOGE("Failed to find onNativeEvent");
        return JNI_ERR;
    }

    g_mid_onPropertyChanged = env->GetStaticMethodID(
        g_cls_MPVLib, "onNativePropertyChanged",
        "(Ljava/lang/String;Ljava/lang/String;)V");
    if (!g_mid_onPropertyChanged) {
        LOGE("Failed to find onNativePropertyChanged");
        return JNI_ERR;
    }

    g_mid_onError = env->GetStaticMethodID(
        g_cls_MPVLib, "onNativeError",
        "(ILjava/lang/String;)V");
    if (!g_mid_onError) {
        LOGE("Failed to find onNativeError");
        return JNI_ERR;
    }

    // Set JVM for FFmpeg and libmpv (which uses av_jni_get_java_vm)
    void* avcodec_handle = dlopen("libavcodec.so", RTLD_NOW);
    if (avcodec_handle) {
        typedef int (*av_jni_set_java_vm_t)(void *vm, void *log_ctx);
        av_jni_set_java_vm_t set_vm = (av_jni_set_java_vm_t)dlsym(avcodec_handle, "av_jni_set_java_vm");
        if (set_vm) {
            set_vm(vm, nullptr);
            LOGI("av_jni_set_java_vm called successfully");
        } else {
            LOGE("dlsym failed for av_jni_set_java_vm: %s", dlerror());
        }
    } else {
        LOGE("dlopen failed for libavcodec.so: %s", dlerror());
    }

    LOGI("JNI_OnLoad complete");
    return JNI_VERSION_1_6;
}

// ── Helper: call static Java method from any thread ───────────────────────

static void callStaticJavaVoid(JNIEnv *env, jmethodID mid, ...) {
    va_list args;
    va_start(args, mid);
    env->CallStaticVoidMethodV(g_cls_MPVLib, mid, args);
    va_end(args);
}

static JNIEnv *getEnv() {
    JNIEnv *env = nullptr;
    if (g_vm->GetEnv(reinterpret_cast<void **>(&env), JNI_VERSION_1_6) == JNI_OK)
        return env;
    JavaVMAttachArgs args = {JNI_VERSION_1_6, nullptr, nullptr};
    if (g_vm->AttachCurrentThread(&env, &args) == JNI_OK)
        return env;
    return nullptr;
}

// ── Lifecycle ─────────────────────────────────────────────────────────────

extern "C" JNIEXPORT jlong JNICALL
Java_com_simba_player_mpv_MPVLib_nativeCreate(JNIEnv *env, jclass) {
    if (g_mpv) {
        LOGI("mpv instance already exists, returning existing");
        return reinterpret_cast<jlong>(g_mpv);
    }

    g_initialized = false;

    mpv_handle *mpv = mpv_create();
    if (!mpv) {
        LOGE("mpv_create failed");
        return 0;
    }

    // Set pre-init options (NOT wid — that requires the Surface and will be
    // set in nativeAttachSurface before mpv_initialize).
    mpv_set_option_string(mpv, "vo", "gpu");
    mpv_set_option_string(mpv, "gpu-api", "opengl");
    mpv_set_option_string(mpv, "hwdec", "mediacodec");
    // Let mpv preserve the source transfer function and range instead of
    // applying a blanket SDR conversion. This keeps SDR/HDR content neutral
    // on devices that expose the required display metadata.
    mpv_set_option_string(mpv, "video-output-levels", "auto");
    mpv_set_option_string(mpv, "target-colorspace-hint", "yes");
    mpv_set_option_string(mpv, "correct-downscaling", "yes");
    mpv_set_option_string(mpv, "audio-device-auto", "yes");
    mpv_set_option_string(mpv, "keep-open", "yes");
    mpv_set_option_string(mpv, "pause", "no");

    // ── Streaming / buffering tuning ────────────────────────────────────
    // These are the same options used by desktop MPV configs to get
    // YouTube/Netflix-class seek-bar buffered-range visualization and
    // snappy re-seeks on slow network streams (archive.org HLS, etc.).
    //
    //   • cache=yes              : enable a RAM cache even for non-network
    //                              sources (so seek-back is instant).
    //   • cache-secs=120         : keep ~2 minutes of stream ahead of the
    //                              playhead in RAM. Big enough to absorb a
    //                              brief re-buffer without a spinner, small
    //                              enough to stay under mobile RAM limits.
    //   • demuxer-max-bytes      : hard upper bound on the cache size in
    //                              bytes (≈150 MB). Prevents OOM on large
    //                              VOD files over HTTP.
    //   • demuxer-max-back-bytes : how far backwards the cache retains
    //                              data (~75 MB). This is what makes
    //                              "seek back 30 s" instantaneous.
    //   • demuxer-readahead-secs : how many seconds of stream to prefetch
    //                              ahead of the playhead.
    //   • demuxer-termination-timeout : if a network read stalls, fail
    //                              the demuxer so the player can recover
    //                              instead of hanging forever.
    //   • prefetch-playlist=yes  : proactively fetch the next playlist
    //                              entry (HLS / DASH) to enable gapless.
    mpv_set_option_string(mpv, "cache", "yes");
    mpv_set_option_string(mpv, "cache-secs", "120");
    mpv_set_option_string(mpv, "demuxer-max-bytes", "150MiB");
    mpv_set_option_string(mpv, "demuxer-max-back-bytes", "75MiB");
    mpv_set_option_string(mpv, "demuxer-readahead-secs", "120");
    mpv_set_option_string(mpv, "demuxer-termination-timeout", "10");
    mpv_set_option_string(mpv, "prefetch-playlist", "yes");

    // NOTE: mpv_initialize() is deliberately NOT called here.
    // It is deferred until nativeAttachSurface so that the "wid" option
    // (which requires the Surface pointer) can be set first.
    // mpv_set_option("wid") after mpv_initialize() is undefined behavior.

    g_mpv = mpv;
    LOGI("mpv instance created (awaiting surface for init)");
    return reinterpret_cast<jlong>(mpv);
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeDestroy(JNIEnv *env, jclass) {
    if (!g_mpv) return;

    g_running = false;
    g_initialized = false;

    mpv_wakeup(g_mpv);
    if (g_eventThread) {
        pthread_join(g_eventThread, nullptr);
        g_eventThread = 0;
    }

    mpv_destroy(g_mpv);
    g_mpv = nullptr;
    LOGI("mpv instance destroyed");
}

// Global reference to the surface so mpv's thread can use it
static jobject g_surface = nullptr;

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeSetPropertyString(
    JNIEnv *env, jclass, jlong nativePtr, jstring property, jstring value) {
    if (!nativePtr || !property) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    const char *prop = env->GetStringUTFChars(property, nullptr);
    const char *val = value ? env->GetStringUTFChars(value, nullptr) : nullptr;
    int result = mpv_set_property_string(mpv, prop, val);
    if (result < 0) {
        LOGE("mpv_set_property_string(%s) failed: %s", prop, mpv_error_string(result));
    }
    env->ReleaseStringUTFChars(property, prop);
    if (val) env->ReleaseStringUTFChars(value, val);
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeAttachSurface(
    JNIEnv *env, jclass, jlong nativePtr, jobject surface) {
    if (!nativePtr) return;

    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);

    if (surface) {
        // ── Attach surface ──────────────────────────────────────────────
        if (g_surface) {
            env->DeleteGlobalRef(g_surface);
            g_surface = nullptr;
        }
        g_surface = env->NewGlobalRef(surface);
        if (!g_surface) {
            LOGE("Failed to create GlobalRef for surface");
            return;
        }

        if (!g_initialized) {
            // First attach — set wid, then initialize mpv and start
            // the event thread.  Setting wid after init is typically UB
            // in mpv, but we only do it here before init.
            int64_t wid = reinterpret_cast<intptr_t>(g_surface);
            int result = mpv_set_option(mpv, "wid", MPV_FORMAT_INT64, &wid);
            if (result < 0) {
                LOGE("mpv_set_option(wid) failed: %s", mpv_error_string(result));
                env->DeleteGlobalRef(g_surface);
                g_surface = nullptr;
                return;
            }

            if (mpv_initialize(mpv) < 0) {
                LOGE("mpv_initialize failed");
                env->DeleteGlobalRef(g_surface);
                g_surface = nullptr;
                return;
            }
            mpv_request_log_messages(mpv, "v");
            g_initialized = true;
            g_running = true;
            pthread_create(&g_eventThread, nullptr, [](void *) -> void * {
                eventLoop();
                return nullptr;
            }, nullptr);

            LOGI("Surface attached and mpv initialized");
        } else {
            // Re-attach — mpv was told to set vo=null (destroying the gpu
            // VO and releasing the old ANativeWindow) before this call.
            // Now we must update the wid option so that when vo=gpu is
            // restored (from the Java side), mpv creates a new ANativeWindow
            // from the new Surface.
            //
            // mpv_set_option("wid") after init is typically UB, but it
            // works safely here because the gpu VO is currently unloaded
            // (vo=null), so there is nothing actively using the wid value.
            // The option is simply stored and picked up when the VO is
            // re-initialized.
            int64_t wid = reinterpret_cast<intptr_t>(g_surface);
            int result = mpv_set_property(mpv, "wid", MPV_FORMAT_INT64, &wid);
            if (result < 0) {
                LOGW("mpv_set_property(wid) on re-attach failed: %s", mpv_error_string(result));
            }

            LOGI("Surface re-attached with new wid");
        }

        // Emit surfaceAttached event
        JNIEnv* jniEnv = getEnv();
        if (jniEnv && g_mid_onEvent) {
            jstring jName = jniEnv->NewStringUTF("surfaceAttached");
            jstring jPayload = jniEnv->NewStringUTF("{}");
            callStaticJavaVoid(jniEnv, g_mid_onEvent, jName, jPayload);
            jniEnv->DeleteLocalRef(jName);
            jniEnv->DeleteLocalRef(jPayload);
        }
    } else {
        // ── Detach surface ─────────────────────────────────────────────
        // NOTE: The caller (MpvRenderView) should have set vo=null BEFORE
        // calling this. This forces mpv's gpu VO to release its
        // ANativeWindow reference, making it safe to delete the JNI global
        // ref without causing a stale reference crash later.
        if (g_surface) {
            env->DeleteGlobalRef(g_surface);
            g_surface = nullptr;
        }
        LOGI("Surface detached (JNI ref cleaned up)");
    }
}

// ── Surface size change notification ─────────────────────────────────────────
// TextureView.onSurfaceTextureSizeChanged fires whenever React Native
// re-lays-out the view (e.g. on rotation). MPV's `wid` backend uses the
// underlying ANativeWindow directly, which already updates its dimensions
// when the surface size changes — MPV sees the new size on the next render
// frame and reflows its video output accordingly.
//
// The previous implementation set a fake `display-size` property, but that
// property doesn't exist in mpv's option table, so the call was a silent
// no-op (and a misleading log message). Now we just log the resize and let
// the surface update pipeline handle the rest.
extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeSurfaceChanged(
    JNIEnv *env, jclass, jlong nativePtr, jint width, jint height) {
    if (!nativePtr || !g_initialized) return;
    LOGI("Surface size changed: %dx%d (handled by ANativeWindow)", width, height);
}

// ── Playback Control ────────────────────────────────────────────────────────

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeLoadFile(
    JNIEnv *env, jclass, jlong nativePtr, jstring path) {
    if (!nativePtr || !path) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    const char *utfPath = env->GetStringUTFChars(path, nullptr);
    const char *cmd[] = {"loadfile", utfPath, nullptr};
    mpv_command(mpv, cmd);
    env->ReleaseStringUTFChars(path, utfPath);
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativePlay(JNIEnv *env, jclass, jlong nativePtr) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    mpv_set_property_string(mpv, "pause", "no");
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativePause(JNIEnv *env, jclass, jlong nativePtr) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    mpv_set_property_string(mpv, "pause", "yes");
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeStop(JNIEnv *env, jclass, jlong nativePtr) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    mpv_command_string(mpv, "stop");
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeTogglePlayPause(
    JNIEnv *env, jclass, jlong nativePtr) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    int pause;
    mpv_get_property(mpv, "pause", MPV_FORMAT_FLAG, &pause);
    mpv_set_property_string(mpv, "pause", pause ? "no" : "yes");
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeSeek(
    JNIEnv *env, jclass, jlong nativePtr, jdouble position) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    char cmd[64];
    snprintf(cmd, sizeof(cmd), "%.3f", position);
    const char *args[] = {"seek", cmd, "absolute", nullptr};
    mpv_command(mpv, args);
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeSeekRelative(
    JNIEnv *env, jclass, jlong nativePtr, jdouble seconds) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    char cmd[64];
    snprintf(cmd, sizeof(cmd), "%.3f", seconds);
    const char *args[] = {"seek", cmd, "relative", nullptr};
    mpv_command(mpv, args);
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeStepFrame(
    JNIEnv *env, jclass, jlong nativePtr, jint direction) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    if (direction > 0)
        mpv_command_string(mpv, "frame-step");
    else
        mpv_command_string(mpv, "frame-back-step");
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_simba_player_mpv_MPVLib_nativeScreenshot(
    JNIEnv *env, jclass, jlong nativePtr, jstring outputPath) {
    if (!nativePtr) return env->NewStringUTF("");
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    const char *path = env->GetStringUTFChars(outputPath, nullptr);
    const char *args[] = {"screenshot-to-file", path, nullptr};
    mpv_command(mpv, args);
    env->ReleaseStringUTFChars(outputPath, path);
    return outputPath;
}

// ── Volume ──────────────────────────────────────────────────────────────────

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeSetVolume(
    JNIEnv *env, jclass, jlong nativePtr, jdouble volume) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    mpv_set_property(mpv, "volume", MPV_FORMAT_DOUBLE, &volume);
}

extern "C" JNIEXPORT jdouble JNICALL
Java_com_simba_player_mpv_MPVLib_nativeGetVolume(
    JNIEnv *env, jclass, jlong nativePtr) {
    if (!nativePtr) return 0;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    double vol = 100;
    mpv_get_property(mpv, "volume", MPV_FORMAT_DOUBLE, &vol);
    return vol;
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeSetMuted(
    JNIEnv *env, jclass, jlong nativePtr, jboolean muted) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    int flag = muted ? 1 : 0;
    mpv_set_property(mpv, "mute", MPV_FORMAT_FLAG, &flag);
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_simba_player_mpv_MPVLib_nativeGetMuted(
    JNIEnv *env, jclass, jlong nativePtr) {
    if (!nativePtr) return JNI_FALSE;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    int muted = 0;
    mpv_get_property(mpv, "mute", MPV_FORMAT_FLAG, &muted);
    return muted ? JNI_TRUE : JNI_FALSE;
}

// ── Speed ───────────────────────────────────────────────────────────────────

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeSetSpeed(
    JNIEnv *env, jclass, jlong nativePtr, jdouble speed) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    mpv_set_property(mpv, "speed", MPV_FORMAT_DOUBLE, &speed);
}

extern "C" JNIEXPORT jdouble JNICALL
Java_com_simba_player_mpv_MPVLib_nativeGetSpeed(
    JNIEnv *env, jclass, jlong nativePtr) {
    if (!nativePtr) return 1.0;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    double speed = 1.0;
    mpv_get_property(mpv, "speed", MPV_FORMAT_DOUBLE, &speed);
    return speed;
}

// ── Loop ────────────────────────────────────────────────────────────────────

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeSetLoopMode(
    JNIEnv *env, jclass, jlong nativePtr, jint mode) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    switch (mode) {
        case 1: mpv_set_property_string(mpv, "loop-file", "inf"); break;
        case 2: mpv_set_property_string(mpv, "loop-playlist", "inf"); break;
        default:
            mpv_set_property_string(mpv, "loop-file", "no");
            mpv_set_property_string(mpv, "loop-playlist", "no");
            break;
    }
}

extern "C" JNIEXPORT jint JNICALL
Java_com_simba_player_mpv_MPVLib_nativeGetLoopMode(
    JNIEnv *env, jclass, jlong nativePtr) {
    if (!nativePtr) return 0;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    char val[8] = {0};
    mpv_get_property(mpv, "loop-file", MPV_FORMAT_STRING, &val);
    if (strcmp(val, "inf") == 0 || strcmp(val, "yes") == 0) return 1;
    mpv_get_property(mpv, "loop-playlist", MPV_FORMAT_STRING, &val);
    if (strcmp(val, "inf") == 0 || strcmp(val, "yes") == 0) return 2;
    return 0;
}

// ── Playlist ────────────────────────────────────────────────────────────────

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeLoadPlaylist(
    JNIEnv *env, jclass, jlong nativePtr, jobjectArray paths, jint startIndex) {
    if (!nativePtr || !paths) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    mpv_command_string(mpv, "playlist-clear");
    jsize count = env->GetArrayLength(paths);
    for (jsize i = 0; i < count; i++) {
        jstring jpath = (jstring)env->GetObjectArrayElement(paths, i);
        const char *utfPath = env->GetStringUTFChars(jpath, nullptr);
        const char *cmd[] = {"loadfile", utfPath, i == 0 ? "replace" : "append", nullptr};
        mpv_command(mpv, cmd);
        env->ReleaseStringUTFChars(jpath, utfPath);
    }
    if (startIndex > 0) {
        mpv_set_property(mpv, "playlist-pos", MPV_FORMAT_INT64, &startIndex);
    }
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativePlaylistNext(
    JNIEnv *env, jclass, jlong nativePtr) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    mpv_command_string(mpv, "playlist-next");
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativePlaylistPrev(
    JNIEnv *env, jclass, jlong nativePtr) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    mpv_command_string(mpv, "playlist-prev");
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativePlaylistRemove(
    JNIEnv *env, jclass, jlong nativePtr, jint index) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    char cmd[32];
    snprintf(cmd, sizeof(cmd), "%d", index);
    const char *args[] = {"playlist-remove", cmd, nullptr};
    mpv_command(mpv, args);
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativePlaylistShuffle(
    JNIEnv *env, jclass, jlong nativePtr) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    mpv_command_string(mpv, "playlist-shuffle");
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativePlaylistClear(
    JNIEnv *env, jclass, jlong nativePtr) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    mpv_command_string(mpv, "playlist-clear");
}

// ── Tracks ──────────────────────────────────────────────────────────────────

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeSelectTrack(
    JNIEnv *env, jclass, jlong nativePtr, jint trackId) {
    if (!nativePtr) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    mpv_set_property(mpv, "vid", MPV_FORMAT_INT64, &trackId);
}

// ── Filters ─────────────────────────────────────────────────────────────────

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeSetVideoFilter(
    JNIEnv *env, jclass, jlong nativePtr, jstring filter, jboolean enable) {
    if (!nativePtr || !filter) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    const char *utf = env->GetStringUTFChars(filter, nullptr);
    if (enable) {
        const char *cmd[] = {"vf", "add", utf, nullptr};
        mpv_command(mpv, cmd);
    } else {
        const char *cmd[] = {"vf", "del", utf, nullptr};
        mpv_command(mpv, cmd);
    }
    env->ReleaseStringUTFChars(filter, utf);
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeSetAudioFilter(
    JNIEnv *env, jclass, jlong nativePtr, jstring filter, jboolean enable) {
    if (!nativePtr || !filter) return;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    const char *utf = env->GetStringUTFChars(filter, nullptr);
    if (enable) {
        const char *cmd[] = {"af", "add", utf, nullptr};
        mpv_command(mpv, cmd);
    } else {
        const char *cmd[] = {"af", "del", utf, nullptr};
        mpv_command(mpv, cmd);
    }
    env->ReleaseStringUTFChars(filter, utf);
}

// ── State Queries ────────────────────────────────────────────────────────────

extern "C" JNIEXPORT jdouble JNICALL
Java_com_simba_player_mpv_MPVLib_nativeGetPosition(
    JNIEnv *env, jclass, jlong nativePtr) {
    if (!nativePtr) return 0;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    double pos = 0;
    mpv_get_property(mpv, "time-pos", MPV_FORMAT_DOUBLE, &pos);
    return pos;
}

extern "C" JNIEXPORT jdouble JNICALL
Java_com_simba_player_mpv_MPVLib_nativeGetDuration(
    JNIEnv *env, jclass, jlong nativePtr) {
    if (!nativePtr) return 0;
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    double dur = 0;
    mpv_get_property(mpv, "duration", MPV_FORMAT_DOUBLE, &dur);
    return dur;
}
