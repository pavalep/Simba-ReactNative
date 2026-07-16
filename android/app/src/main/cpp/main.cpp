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
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// ── Globals ────────────────────────────────────────────────────────────────

JavaVM *g_vm = nullptr;
mpv_handle *g_mpv = nullptr;
static pthread_t g_eventThread = 0;
volatile bool g_running = false;

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

    mpv_handle *mpv = mpv_create();
    if (!mpv) {
        LOGE("mpv_create failed");
        return 0;
    }

    // Use the gpu VO with wid (Android Surface) — the standard approach
    // used by all working Android mpv implementations.
    // mpv manages EGL/OpenGL internally; we just pass it the Surface.
    // On Android, mpv auto-detects the gpu-context, so we don't set it explicitly.
    mpv_set_option_string(mpv, "vo", "gpu");
    mpv_set_option_string(mpv, "gpu-api", "opengl");

    // Enable hardware decoding — works with wid because mpv has the Surface
    // to pass to MediaCodec for zero-copy decode.
    mpv_set_option_string(mpv, "hwdec", "mediacodec");

    mpv_set_option_string(mpv, "audio-device-auto", "yes");
    mpv_set_option_string(mpv, "keep-open", "yes");
    mpv_set_option_string(mpv, "pause", "no");

    if (mpv_initialize(mpv) < 0) {
        LOGE("mpv_initialize failed");
        mpv_destroy(mpv);
        return 0;
    }

    mpv_request_log_messages(mpv, "v");

    g_mpv = mpv;
    g_running = true;

    pthread_create(&g_eventThread, nullptr, [](void *) -> void * {
        eventLoop();
        return nullptr;
    }, nullptr);

    LOGI("mpv instance created (wid mode)");
    return reinterpret_cast<jlong>(mpv);
}

extern "C" JNIEXPORT void JNICALL
Java_com_simba_player_mpv_MPVLib_nativeDestroy(JNIEnv *env, jclass) {
    if (!g_mpv) return;

    g_running = false;

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
Java_com_simba_player_mpv_MPVLib_nativeAttachSurface(
    JNIEnv *env, jclass, jlong nativePtr, jobject surface) {
    if (!nativePtr) return;

    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);

    if (surface) {
        if (g_surface) {
            env->DeleteGlobalRef(g_surface);
            g_surface = nullptr;
        }
        g_surface = env->NewGlobalRef(surface);
        if (!g_surface) {
            LOGE("Failed to create GlobalRef for surface");
            return;
        }

        // Convert android.view.Surface to int64_t and pass as wid.
        // mpv's gpu VO will take ownership of the Surface, create an EGL context
        // and ANativeWindow internally, and handle all rendering.
        int64_t wid = reinterpret_cast<intptr_t>(g_surface);
        int result = mpv_set_option(mpv, "wid", MPV_FORMAT_INT64, &wid);
        if (result < 0)
            LOGE("mpv_set_option(wid) returned error: %s", mpv_error_string(result));
        else {
            LOGI("Surface attached via wid");
            JNIEnv* jniEnv = getEnv();
            if (jniEnv && g_mid_onEvent) {
                jstring jName = jniEnv->NewStringUTF("surfaceAttached");
                jstring jPayload = jniEnv->NewStringUTF("{}");
                callStaticJavaVoid(jniEnv, g_mid_onEvent, jName, jPayload);
                jniEnv->DeleteLocalRef(jName);
                jniEnv->DeleteLocalRef(jPayload);
            }
        }
    } else {
        // Detach — pass wid=0
        int64_t wid = 0;
        mpv_set_option(mpv, "wid", MPV_FORMAT_INT64, &wid);
        if (g_surface) {
            env->DeleteGlobalRef(g_surface);
            g_surface = nullptr;
        }
        LOGI("Surface detached (wid=0)");
    }
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
    JNIEnv *env, jclass, jlong nativePtr) {
    if (!nativePtr) return env->NewStringUTF("");
    mpv_handle *mpv = reinterpret_cast<mpv_handle *>(nativePtr);
    const char *args[] = {"screenshot-to-file", "/tmp/mpv_screenshot.png", nullptr};
    mpv_command(mpv, args);
    return env->NewStringUTF("/tmp/mpv_screenshot.png");
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
