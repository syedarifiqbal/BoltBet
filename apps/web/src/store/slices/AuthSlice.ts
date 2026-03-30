import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UserRole = 'USER' | 'VIP_USER' | 'ADMIN';

export interface AuthUser {
  id:    string;
  email: string;
  role:  UserRole;
}

interface AuthState {
  /** Access token lives in memory only — never localStorage, never a cookie. */
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True while the app is attempting a silent token refresh on mount. */
  isRefreshing: boolean;
}

const initialState: AuthState = {
  accessToken: null,
  user:        null,
  isAuthenticated: false,
  isRefreshing: true, // start true — assume we need to try a refresh on load
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Called after a successful login or token refresh.
     * The JWT payload (sub, role) is decoded client-side to populate user.
     * We trust the token's signature was verified server-side — we only
     * decode it here for display purposes (role-based UI, user ID).
     */
    setCredentials(
      state,
      action: PayloadAction<{ accessToken: string; user: AuthUser }>,
    ) {
      state.accessToken    = action.payload.accessToken;
      state.user           = action.payload.user;
      state.isAuthenticated = true;
      state.isRefreshing   = false;
    },

    /** Called when the refresh attempt on app mount completes (success or fail). */
    setRefreshDone(state) {
      state.isRefreshing = false;
    },

    /** Called on logout or when refresh fails. Clears all auth state. */
    clearCredentials(state) {
      state.accessToken    = null;
      state.user           = null;
      state.isAuthenticated = false;
      state.isRefreshing   = false;
    },
  },
});

export const { setCredentials, setRefreshDone, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
