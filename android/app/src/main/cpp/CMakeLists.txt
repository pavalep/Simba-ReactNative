cmake_minimum_required(VERSION 3.22.1)

project(appmodules)

# ═══════════════════════════════════════════════════
# React Native Application CMake (from ReactNative-application.cmake)
# Builds libappmodules.so — required for TurboModule registration
# ═══════════════════════════════════════════════════

include(${REACT_ANDROID_DIR}/cmake-utils/folly-flags.cmake)

set(REACT_COMMON_DIR ${REACT_ANDROID_DIR}/../ReactCommon)
include(${REACT_COMMON_DIR}/cmake-utils/react-native-flags.cmake)

find_program(CCACHE_FOUND ccache)
if(CCACHE_FOUND)
    set_property(GLOBAL PROPERTY RULE_LAUNCH_COMPILE ccache)
    set_property(GLOBAL PROPERTY RULE_LAUNCH_LINK ccache)
endif()

include(CheckIPOSupported)
check_ipo_supported(RESULT IPO_SUPPORT)
if(IPO_SUPPORT)
    set(CMAKE_INTERPROCEDURAL_OPTIMIZATION TRUE)
endif()

set(BUILD_DIR ${PROJECT_BUILD_DIR})
file(TO_CMAKE_PATH "${BUILD_DIR}" BUILD_DIR)
file(TO_CMAKE_PATH "${REACT_ANDROID_DIR}" REACT_ANDROID_DIR)

# Source files for libappmodules.so — default OnLoad.cpp + autolinking sources
file(GLOB input_SRC CONFIGURE_DEPENDS
    ${REACT_ANDROID_DIR}/cmake-utils/default-app-setup/*.cpp
    ${BUILD_DIR}/generated/autolinking/src/main/jni/*.cpp
)

add_library(appmodules SHARED ${input_SRC})

target_include_directories(appmodules
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${BUILD_DIR}/generated/autolinking/src/main/jni
)

target_compile_reactnative_options(appmodules PRIVATE)

# Prefab packages from React Native
find_package(ReactAndroid REQUIRED CONFIG)
add_library(jsi ALIAS ReactAndroid::jsi)
add_library(reactnative ALIAS ReactAndroid::reactnative)

find_package(fbjni REQUIRED CONFIG)
add_library(fbjni ALIAS fbjni::fbjni)

target_link_libraries(appmodules
    fbjni
    jsi
    reactnative
)

# Common flags interface (for autolinked 3rd-party libs + codegen)
add_library(common_flags INTERFACE)
target_compile_options(common_flags INTERFACE ${folly_FLAGS})

# Autolinked 3rd-party libraries
if(EXISTS ${BUILD_DIR}/generated/autolinking/src/main/jni/Android-autolinking.cmake)
    include(${BUILD_DIR}/generated/autolinking/src/main/jni/Android-autolinking.cmake)
    target_link_libraries(appmodules ${AUTOLINKED_LIBRARIES})
    foreach(autolinked_library ${AUTOLINKED_LIBRARIES})
        target_link_libraries(${autolinked_library} common_flags)
    endforeach()
endif()

# Codegen — link react_codegen_SimbaPlayer into appmodules
if(EXISTS ${BUILD_DIR}/generated/source/codegen/jni/CMakeLists.txt)
    add_subdirectory(${BUILD_DIR}/generated/source/codegen/jni/ codegen_app_build)
    get_property(APP_CODEGEN_TARGET DIRECTORY ${BUILD_DIR}/generated/source/codegen/jni/ PROPERTY BUILDSYSTEM_TARGETS)
    target_link_libraries(appmodules ${APP_CODEGEN_TARGET})
    target_link_libraries(${APP_CODEGEN_TARGET} common_flags)

    # Pass codegen defines to OnLoad.cpp for TurboModule registration
    string(REGEX REPLACE "react_codegen_" "" APP_CODEGEN_HEADER "${APP_CODEGEN_TARGET}")
    target_compile_options(appmodules
        PRIVATE
            -DREACT_NATIVE_APP_CODEGEN_HEADER="${APP_CODEGEN_HEADER}.h"
            -DREACT_NATIVE_APP_COMPONENT_DESCRIPTORS_HEADER="react/renderer/components/${APP_CODEGEN_HEADER}/ComponentDescriptors.h"
            -DREACT_NATIVE_APP_COMPONENT_REGISTRATION=${APP_CODEGEN_HEADER}_registerComponentDescriptorsFromCodegen
            -DREACT_NATIVE_APP_MODULE_PROVIDER=${APP_CODEGEN_HEADER}_ModuleProvider
    )
endif()

set(REACTNATIVE_MERGED_SO true)

# ═══════════════════════════════════════════════════
# libsimbaplayer_mpv.so — Native wrapper around libmpv for Android JNI
# ═══════════════════════════════════════════════════

add_library(
    simbaplayer_mpv
    SHARED
    main.cpp
    property.cpp
    event.cpp
)

# Locate pre-built libmpv.so
set(MPV_LIB_PATH ${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libmpv.so)
if(EXISTS ${MPV_LIB_PATH})
    add_library(mpv SHARED IMPORTED)
    set_target_properties(mpv PROPERTIES IMPORTED_LOCATION ${MPV_LIB_PATH})
    message(STATUS "Found libmpv.so at ${MPV_LIB_PATH}")
else()
    message(WARNING "libmpv.so not found at ${MPV_LIB_PATH} — link will fail")
endif()

target_include_directories(
    simbaplayer_mpv
    PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/include/mpv
)

target_link_libraries(
    simbaplayer_mpv
    android
    log
    mpv
)
