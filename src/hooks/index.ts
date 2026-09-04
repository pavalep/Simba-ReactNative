export {useOrientation} from './useOrientation';
export {useKeyboard} from './useKeyboard';
export {useAutoHideControls} from './useAutoHideControls';
export {
  useEnterAnimation,
  useExitAnimation,
  useTabPressAnimation,
} from './useScreenTransition';
// Phase 44 (Wave 8): usePipLifecycle + usePipEntry removed in Wave 8 Phase 44.
// The V11 inline-mount PiP hooks have zero consumers (audited via Grep;
// only the barrel export referenced them). V12's `PlayerActivity` handles
// PiP lifecycle natively via `onUserLeaveHint` + `onPictureInPictureModeChanged`
// — no JS hook is needed. See
// [`SIMBA_PLAYER_MODULE_V12_PIP_HOOK_REMOVAL.md`](
../../../md/SIMBA_PLAYER_MODULE_V12_PIP_HOOK_REMOVAL.md) §1 + §2.
export {useNetworkStatus} from './useNetworkStatus';
export {useMediaScanner} from './useMediaScanner';
