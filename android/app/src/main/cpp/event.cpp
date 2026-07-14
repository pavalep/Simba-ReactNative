#include <jni.h>
#include <android/log.h>
#include <string>
#include <cstring>
#include <client.h>

#define LOG_TAG "MpvEvent"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// ── External globals set by main.cpp ────────────────────────────────────────

extern JavaVM *g_vm;
extern mpv_handle *g_mpv;
extern volatile bool g_running;

extern jclass g_cls_MPVLib;
extern jmethodID g_mid_onEvent;
extern jmethodID g_mid_onPropertyChanged;
extern jmethodID g_mid_onError;

// ── Helper: attach current thread to JVM and call static void method ────────

static void callJavaEvent(const char *event, const char *jsonPayload) {
    JNIEnv *env = nullptr;
    bool attached = false;
    int getEnvStat = g_vm->GetEnv(reinterpret_cast<void **>(&env), JNI_VERSION_1_6);
    if (getEnvStat == JNI_EDETACHED) {
        JavaVMAttachArgs args = {JNI_VERSION_1_6, "mpv-event-thread", nullptr};
        if (g_vm->AttachCurrentThread(&env, &args) != JNI_OK) {
            LOGE("Failed to attach thread for event dispatch");
            return;
        }
        attached = true;
    } else if (getEnvStat != JNI_OK) {
        LOGE("GetEnv failed");
        return;
    }

    jstring jEvent = env->NewStringUTF(event);
    jstring jPayload = env->NewStringUTF(jsonPayload);
    env->CallStaticVoidMethod(g_cls_MPVLib, g_mid_onEvent, jEvent, jPayload);
    env->DeleteLocalRef(jEvent);
    env->DeleteLocalRef(jPayload);

    if (attached)
        g_vm->DetachCurrentThread();
}

static void callJavaPropertyChanged(const char *name, const char *jsonValue) {
    JNIEnv *env = nullptr;
    bool attached = false;
    int getEnvStat = g_vm->GetEnv(reinterpret_cast<void **>(&env), JNI_VERSION_1_6);
    if (getEnvStat == JNI_EDETACHED) {
        JavaVMAttachArgs args = {JNI_VERSION_1_6, "mpv-event-thread", nullptr};
        if (g_vm->AttachCurrentThread(&env, &args) != JNI_OK) return;
        attached = true;
    } else if (getEnvStat != JNI_OK) return;

    jstring jName = env->NewStringUTF(name);
    jstring jValue = env->NewStringUTF(jsonValue);
    env->CallStaticVoidMethod(g_cls_MPVLib, g_mid_onPropertyChanged, jName, jValue);
    env->DeleteLocalRef(jName);
    env->DeleteLocalRef(jValue);

    if (attached)
        g_vm->DetachCurrentThread();
}

static void callJavaError(int code, const char *message) {
    JNIEnv *env = nullptr;
    bool attached = false;
    int getEnvStat = g_vm->GetEnv(reinterpret_cast<void **>(&env), JNI_VERSION_1_6);
    if (getEnvStat == JNI_EDETACHED) {
        JavaVMAttachArgs args = {JNI_VERSION_1_6, "mpv-event-thread", nullptr};
        if (g_vm->AttachCurrentThread(&env, &args) != JNI_OK) return;
        attached = true;
    } else if (getEnvStat != JNI_OK) return;

    jstring jMsg = env->NewStringUTF(message);
    env->CallStaticVoidMethod(g_cls_MPVLib, g_mid_onError, code, jMsg);
    env->DeleteLocalRef(jMsg);

    if (attached)
        g_vm->DetachCurrentThread();
}

// ── Event Loop ──────────────────────────────────────────────────────────────

void eventLoop() {
    LOGI("Event loop started");

    while (g_running) {
        mpv_event *event = mpv_wait_event(g_mpv, -1);
        if (!event) continue;

        switch (event->event_id) {
            case MPV_EVENT_NONE:
                break;

            case MPV_EVENT_SHUTDOWN:
                LOGI("MPV_EVENT_SHUTDOWN");
                g_running = false;
                break;

            case MPV_EVENT_FILE_LOADED:
                LOGI("MPV_EVENT_FILE_LOADED");
                callJavaEvent("fileLoaded", "{}");
                break;

            case MPV_EVENT_START_FILE:
                LOGI("MPV_EVENT_START_FILE");
                callJavaEvent("startFile", "{}");
                break;

            case MPV_EVENT_END_FILE: {
                auto *prop = (mpv_event_end_file *)event->data;
                char payload[128];
                snprintf(payload, sizeof(payload), "{\"reason\":%d,\"error\":%d}",
                         prop->reason, prop->error);
                callJavaEvent("endFile", payload);
                break;
            }

            case MPV_EVENT_PLAYBACK_RESTART:
                callJavaEvent("playbackRestart", "{}");
                break;

            case MPV_EVENT_SEEK:
                callJavaEvent("seek", "{}");
                break;

            case MPV_EVENT_QUEUE_OVERFLOW:
                LOGE("MPV_EVENT_QUEUE_OVERFLOW");
                callJavaEvent("queueOverflow", "{}");
                break;

            case MPV_EVENT_PROPERTY_CHANGE: {
                auto *prop = (mpv_event_property *)event->data;
                if (prop->format == MPV_FORMAT_NONE) break;
                mpv_node node;
                node.format = prop->format;
                // Copy value based on format — simplified
                std::string json;
                if (prop->format == MPV_FORMAT_STRING && prop->data) {
                    json = "\"";
                    json += (const char *)prop->data;
                    json += "\"";
                } else if (prop->format == MPV_FORMAT_FLAG) {
                    json = *(int *)prop->data ? "true" : "false";
                } else if (prop->format == MPV_FORMAT_DOUBLE) {
                    char buf[64];
                    snprintf(buf, sizeof(buf), "%.6f", *(double *)prop->data);
                    json = buf;
                } else if (prop->format == MPV_FORMAT_INT64) {
                    char buf[32];
                    snprintf(buf, sizeof(buf), "%lld", (long long)*(int64_t *)prop->data);
                    json = buf;
                } else {
                    json = "null";
                }
                callJavaPropertyChanged(prop->name, json.c_str());
                break;
            }

            case MPV_EVENT_LOG_MESSAGE:
            case MPV_EVENT_CLIENT_MESSAGE:
            case MPV_EVENT_VIDEO_RECONFIG:
            case MPV_EVENT_AUDIO_RECONFIG:
                // Can be forwarded if needed
                break;

            default:
                LOGI("Unhandled mpv event: %d", event->event_id);
                break;
        }
    }

    LOGI("Event loop exited");
}