import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {RootState} from '..';

export interface PipState {
  /** Whether the app is currently in PiP mode */
  isInPipMode: boolean;

  /** URI of the video surface isolated for PiP rendering */
  surfaceUri: string | null;

  /** Human-readable title shown in PiP notification */
  pipedFileTitle: string | null;

  /** Current chapter title for PiP notification text */
  chapterTitle: string | null;

  /** Current chapter index (0-based) */
  chapterIndex: number;

  /** Progress percentage string like "45 %" for PiP notification */
  progressPercentage: string;
}

const initialState: PipState = {
  isInPipMode: false,
  surfaceUri: null,
  pipedFileTitle: null,
  chapterTitle: null,
  chapterIndex: -1,
  progressPercentage: '0 %',
};

const pipSlice = createSlice({
  name: 'pip',
  initialState,
  reducers: {
    enterPip(
      state,
      action: PayloadAction<{
        surfaceUri: string;
        fileTitle: string;
        chapterTitle: string | null;
        chapterIndex: number;
        progressPercentage: string;
      }>,
    ) {
      state.isInPipMode = true;
      state.surfaceUri = action.payload.surfaceUri;
      state.pipedFileTitle = action.payload.fileTitle;
      state.chapterTitle = action.payload.chapterTitle;
      state.chapterIndex = action.payload.chapterIndex;
      state.progressPercentage = action.payload.progressPercentage;
    },
    exitPip(state) {
      state.isInPipMode = false;
      // Keep surfaceUri/title/chapter info for restoration — cleared on session end
    },
    updatePipProgress(
      state,
      action: PayloadAction<{
        chapterTitle: string | null;
        chapterIndex: number;
        progressPercentage: string;
      }>,
    ) {
      state.chapterTitle = action.payload.chapterTitle;
      state.chapterIndex = action.payload.chapterIndex;
      state.progressPercentage = action.payload.progressPercentage;
    },
    resetPipState() {
      return initialState;
    },
  },
});

export const {enterPip, exitPip, updatePipProgress, resetPipState} =
  pipSlice.actions;

// ── Selectors ──
export const selectIsInPipMode = (state: RootState) => state.pip.isInPipMode;
export const selectSurfaceUri = (state: RootState) => state.pip.surfaceUri;
export const selectPipedFileTitle = (state: RootState) => state.pip.pipedFileTitle;
export const selectPipChapterTitle = (state: RootState) => state.pip.chapterTitle;
export const selectPipChapterIndex = (state: RootState) => state.pip.chapterIndex;
export const selectPipProgressPercentage = (state: RootState) => state.pip.progressPercentage;

export default pipSlice.reducer;
