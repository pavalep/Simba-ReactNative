#!/usr/bin/env python3
"""
parse-framestats.py — Companion to run-perf-benchmarks.ps1 (Phase 37).

Parses the output of `adb shell dumpsys SurfaceFlinger --latency <surface>` and
computes the frame drop rate.

The --latency output format (per docs.android.com):
  - Line 1: refresh-rate (nanoseconds per frame)
  - Lines 2..N: one frame, with 3 timestamps each:
      [present_time, vsync_time, post-composition_time]
    Values are nanoseconds. The first valid frame is at line 2; line 1 is
    the refresh-rate header.

A "dropped frame" is one where the gap between consecutive frames is
>1.5× the refresh-rate interval. This catches both visible stutter and
the OEM-specific "frames skipped to recover schedule" behaviour.
"""

import sys
import re
from pathlib import Path


def parse_framestats(path: Path) -> dict:
    """Returns a dict with: total_frames, dropped_frames, drop_rate_pct, refresh_rate_ns."""
    if not path.exists():
        return {"error": f"file not found: {path}"}

    text = path.read_text(encoding="utf-8")
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    if len(lines) < 2:
        return {"error": "framestats output too short"}

    # Line 1: refresh-rate (nanoseconds)
    try:
        refresh_rate_ns = int(lines[0])
    except ValueError:
        return {"error": f"invalid refresh rate header: {lines[0][:80]}"}

    if refresh_rate_ns <= 0:
        return {"error": f"invalid refresh rate: {refresh_rate_ns}"}

    # Lines 2..N: frame timestamps
    frames = []
    for line in lines[1:]:
        parts = line.split()
        if len(parts) < 3:
            continue
        try:
            present = int(parts[0])
            if present <= 0:
                # 0 means "no data" per the SurfaceFlinger docs
                continue
            frames.append(present)
        except ValueError:
            continue

    if len(frames) < 2:
        return {"error": f"only {len(frames)} valid frames — playback too short?"}

    # Compute inter-frame gaps
    gaps_ns = [frames[i + 1] - frames[i] for i in range(len(frames) - 1)]

    # Drop threshold: 1.5× refresh interval
    drop_threshold_ns = refresh_rate_ns * 3 // 2  # 1.5x

    dropped = sum(1 for gap in gaps_ns if gap > drop_threshold_ns)
    total = len(gaps_ns)
    drop_rate = (dropped / total) * 100.0

    return {
        "total_frames": total,
        "dropped_frames": dropped,
        "drop_rate_pct": drop_rate,
        "refresh_rate_ns": refresh_rate_ns,
        "refresh_rate_hz": 1e9 / refresh_rate_ns,
        "min_gap_ns": min(gaps_ns),
        "max_gap_ns": max(gaps_ns),
        "avg_gap_ns": sum(gaps_ns) // len(gaps_ns),
    }


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <framestats.txt>", file=sys.stderr)
        sys.exit(2)

    path = Path(sys.argv[1])
    result = parse_framestats(path)

    if "error" in result:
        print(f"ERROR: {result['error']}", file=sys.stderr)
        sys.exit(1)

    # Output in a format the PowerShell harness can grep
    print(f"refresh_rate_hz: {result['refresh_rate_hz']:.2f}")
    print(f"total_frames: {result['total_frames']}")
    print(f"dropped_frames: {result['dropped_frames']}")
    print(f"drop_rate: {result['drop_rate_pct']:.2f}%")
    print(f"avg_gap_ms: {result['avg_gap_ns'] / 1e6:.2f}")
    print(f"min_gap_ms: {result['min_gap_ns'] / 1e6:.2f}")
    print(f"max_gap_ms: {result['max_gap_ns'] / 1e6:.2f}")


if __name__ == "__main__":
    main()
