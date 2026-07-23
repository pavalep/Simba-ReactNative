import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {RootState} from '..';

export interface PipState {
  isInPipMode: boolean;
  pipedVideoUri: string | null;
  pipedPosition: number;
  pipedFileTitle: string | null;
}

const initialState: PipState = {
  isInPipMode: false,
  pipedVideoUri: null,
  pipedPosition: 0,
  pipedFileTitle: null,
};

const pipSlice = createSlice({
  name: 'pip',
  initialState,
  reducers: {
    enterPip(
      state,
      action: PayloadAction<{
        uri: string;
        position: number;
        title: string;
      }>,
    ) {
      state.isInPipMode = true;
      state.pipedVideoUri = action.payload.uri;
      state.pipedPosition = action.payload.position;
      state.pipedFileTitle = action.payload.title;
    },
    exitPip(state) {
      state.isInPipMode = false;
      // Keep uri/position/title for restoration — cleared on session end
    },
    updatePipPosition(state, action: PayloadAction<number>) {
      state.pipedPosition = action.payload;
    },
    resetPipState() {
      return initialState;
    },
  },
});

export const {enterPip, exitPip, updatePipPosition, resetPipState} =
  pipSlice.actions;

// ── Selectors ──
export const selectIsInPipMode = (state: RootState) => state.pip.isInPipMode;
export const selectPipedVideoUri = (state: RootState) => state.pip.pipedVideoUri;
export const selectPipedPosition = (state: RootState) => state.pip.pipedPosition;
export const selectPipedFileTitle = (state: RootState) => state.pip.pipedFileTitle;

export default pipSlice.reducer;
