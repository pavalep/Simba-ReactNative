// The Profile's own dialogs.
//
// The five dialogs the preference rows open — the theme picker, the
// subtitle language and style pickers, the MPV options editor and the
// linked-folders picker. They moved here from `src/screens/Settings/`
// when the Settings page was merged into the Profile
// (`md/PROFILE_SETTINGS_MERGE.md`).
//
// The barrel deliberately does NOT export `ProfileScreen`: the screen
// imports the dialogs through this barrel, and the screen's own hook
// imports `SubtitleLanguageDialog` directly — a barrel that exported the
// screen would close that loop.
export {MpvConfigEditor} from './MpvConfigEditor';
export {LinkedFoldersDialog} from './LinkedFoldersDialog';
export {ThemePickerDialog} from './ThemePickerDialog';
export {SubtitleLanguageDialog, SUBTITLE_LANGUAGES} from './SubtitleLanguageDialog';
export {SubtitleStyleDialog} from './SubtitleStyleDialog';
