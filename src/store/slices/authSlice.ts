import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  photo: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.isAuthenticated = action.payload !== null;
      state.error = null;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    signOut(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.isLoading = false;
    },
  },
});

export const {setLoading, setUser, setError, signOut} = authSlice.actions;

export const selectAuthUser = (state: {auth: AuthState}) => state.auth.user;
export const selectIsAuthenticated = (state: {auth: AuthState}) =>
  state.auth.isAuthenticated;
export const selectAuthLoading = (state: {auth: AuthState}) =>
  state.auth.isLoading;
export const selectAuthError = (state: {auth: AuthState}) => state.auth.error;

export default authSlice.reducer;
