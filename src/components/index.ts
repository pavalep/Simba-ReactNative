// ────────────────────────────────────────────────────────
// Simba Player — Component Barrel (55.6: complete + consistent)
// Shared UI primitives only; screens/player internals are
// imported by path where they are used.
// ────────────────────────────────────────────────────────

// Core
export {AppButton} from './core/AppButton/AppButton';
export {AppText} from './core/AppText/AppText';
export type {AppTextVariant} from './core/AppText/AppText';
export {AppCard} from './core/AppCard/AppCard';
export {AppTextInput} from './core/AppTextInput/AppTextInput';
export type {AppTextInputProps} from './core/AppTextInput/AppTextInput';
export {Avatar} from './core/Avatar/Avatar';
export {Dialog} from './core/Dialog/Dialog';
export {ConfirmDialog, useConfirmDialog} from './core/Dialog/ConfirmDialog';
export {PromptDialog, usePromptDialog} from './core/Dialog/PromptDialog';
export {GoogleSignInButton} from './core/GoogleSignInButton/GoogleSignInButton';
export {KeyboardAwareView} from './core/KeyboardAwareView/KeyboardAwareView';
export {OptionSheetDialog} from './core/OptionSheetDialog/OptionSheetDialog';
export {SearchBar} from './core/SearchBar/SearchBar';
export {SkeletonCard} from './core/Skeleton/SkeletonCard';
export {SkeletonList} from './core/Skeleton/SkeletonList';
export {SkeletonLoader} from './core/Skeleton/SkeletonLoader';
export {LoadingOverlay} from './core/Skeleton/LoadingOverlay';

// Feedback
export {ActivityOrb} from './feedback/ActivityOrb/ActivityOrb';
export {EmptyState} from './feedback/EmptyState/EmptyState';
export {ErrorState} from './feedback/ErrorState/ErrorState';
export {Placeholder} from './feedback/Placeholder/Placeholder';
export type {PlaceholderProps, PlaceholderVariant} from './feedback/Placeholder/Placeholder';
export {PlayerErrorFallback} from './feedback/PlayerErrorFallback/PlayerErrorFallback';
export {PulseRing} from './feedback/PulseRing/PulseRing';
export {ScanProgressBanner} from './feedback/ScanProgressBanner/ScanProgressBanner';
export {ScreenErrorBoundary} from './feedback/ScreenErrorBoundary/ScreenErrorBoundary';
export {ToastProvider, useToast} from './feedback/Toast/Toast';
export {WaveformBars} from './feedback/WaveformBars/WaveformBars';

// Status
export {OfflineBanner} from './status/OfflineBanner/OfflineBanner';
export {OperationProgress} from './status/OperationProgress/OperationProgress';
export {GlobalOperationProgress} from './status/GlobalOperationProgress/GlobalOperationProgress';

// Layout
export {HomeHeader} from './layout/HomeHeader/HomeHeader';
export {InternalHeader} from './layout/InternalHeader/InternalHeader';
export {ScreenContainer} from './layout/ScreenContainer/ScreenContainer';

// Utility
export {SectionHeader} from './utility/SectionHeader/SectionHeader';
export {SettingsRow} from './utility/SettingsRow/SettingsRow';
export {MediaTile} from './utility/MediaTile/MediaTile';
export {SvgIcon} from './utility/SvgIcon/SvgIcon';
export type {SvgIconName} from './utility/SvgIcon/SvgIcon';

// Bookmark
export {BookmarkButton} from './bookmark/BookmarkButton';
export {BookmarkItem} from './bookmark/BookmarkItem';
export {BookmarkList} from './bookmark/BookmarkList';
export {BookmarkSheet} from './bookmark/BookmarkSheet';
