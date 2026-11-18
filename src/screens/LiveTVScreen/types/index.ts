// ─── Live TV Screen — section shell types ─────────────────────────────
//
// The section types live in `src/screens/_shared/` — one copy for the
// whole app. This file re-exports the TWO the Live TV screen imports, so
// its own modules can keep importing from `../types`.
//
// The screen's OWN types: the row it draws and the navigation props its
// two routes take.

export type {SectionRenderContext} from '../../_shared/sectionRenderContext';
export type {SectionBrowseConfig} from '../../_shared/sectionBrowseConfig';

export type {ChannelRow} from '../related/channelRow';
export type {RootStackScreenProps} from '../../../navigation/types';
