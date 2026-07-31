# Beta QA Script — Simba Player 1.1.0

Run on the target device (emulator or physical). Record ✅/❌ + notes for each step.
Results live in `UI_UX_Elevation_Progress_Tracker_v4.md` → Phase 60.

## 1. Cold start & first launch
- [ ] Fresh install → splash animation → scan prompt appears
- [ ] "Skip for now" → lands on Home (or Login if not authenticated)
- [ ] `adb logcat` shows single `[startup]` line at first screen mount
- [ ] Kill app (swipe away) → relaunch → cold start again; no white flash

## 2. Library scan & browse
- [ ] Scan a folder with mixed video/audio → progress banner; completion summary appears
- [ ] Home shelves populate (Continue Watching, Recently Added, etc.)
- [ ] Scroll a shelf with 500+ items — smooth, no `.map` list jank
- [ ] All Audio / All Videos screens scroll fluidly; art does not flicker on re-entry

## 3. Audio playback
- [ ] Play track → transport shows Play/Pause/Prev/Next/Shuffle/Loop
- [ ] Seek bar scrubs; time labels toggle on tap
- [ ] Chapters (if any): marks visible, tap seeks
- [ ] Lyrics view: opens, active line follows playback, auto-scroll works
- [ ] Queue: reorder (drag), remove, play next; batch select/remove
- [ ] Mini-player appears; expand to full player; collapse
- [ ] Resume overlay after killing app mid-track → resumes position

## 4. Video playback
- [ ] Play video → controls auto-hide; tap to show
- [ ] Rotate to landscape; back to portrait
- [ ] Audio panel: switch audio track; equalizer toggle + presets + band sliders
- [ ] Playlist panel: add/remove entries; auto-advance card counts down
- [ ] Bookmark a position; Bookmarks screen lists it; jump works
- [ ] Chapter browser: grid, seek to chapter, auto-scroll to current

## 5. Playlists
- [ ] Create playlist (kind picker: video/audio/mixed); add tracks
- [ ] Reorder items; move up/down; duplicate playlist; rename; delete
- [ ] Multi-select batch: remove selected

## 6. Search
- [ ] Type query → results (videos + audio + playlists) with highlight
- [ ] Filter All/Videos/Audio; sort Relevance/Date/Name
- [ ] Long-press result → Play Next / Add to Queue sheet

## 7. Settings
- [ ] Theme picker: light/dark/system — applies instantly
- [ ] Playback switches (HW accel, normalization, dialogue boost, skip silence)
- [ ] Subtitle settings (font size/color/background) apply to video player
- [ ] Linked folders: add folder, rescan, swipe to remove
- [ ] Audio settings → equalizer screen reachable (57.3 fix)

## 8. Accessibility
- [ ] TalkBack on: 5 core journeys navigable; seek bars adjust via swipe up/down
- [ ] "Now playing" announced on track change
- [ ] Reduce motion (system): splash/entrance/loops render static
- [ ] Touch targets ≥ 44dp effective on all icon buttons

## 9. Stability
- [ ] No crashes during a 10-minute mixed session; `crash.log` absent or empty
- [ ] Background → resume; background → kill → cold start
- [ ] No `Alert.alert` raw dialogs; all confirmations use themed dialogs
