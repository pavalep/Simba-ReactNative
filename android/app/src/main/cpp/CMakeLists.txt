cmake_minimum_required(VERSION 3.22.1)

project("simbaplayer_mpv")

# ── Native library that wraps libmpv for Android JNI ──

add_library(
    simbaplayer_mpv
    SHARED
    main.cpp
    property.cpp
    event.cpp
)

# Locate libmpv headers + shared library
# Pre-built libmpv.so goes in app/src/main/jniLibs/<abi>/
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
