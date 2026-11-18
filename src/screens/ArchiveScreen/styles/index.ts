// ─── Archive — styles barrel ───────────────────────────────────────────
// Each component's style group lives in its own file and is re-exported
// here, so every consumer imports from this single entry point.
//
// The FOOTER's styles are NOT here: the in-flow footer is the shared one
// (`screens/_shared/BrowseListFooter.tsx`), and so is the loading pill
// (`screens/_shared/BrowseLoadingState.tsx`). A surface that needs its
// own footer words passes them as labels.

export {createArchiveScreenStyles} from './ArchiveScreen.styles';
export {createArchiveRowStyles} from './ArchiveRow.styles';
