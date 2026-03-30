import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WalletState {
  balanceCents: number;
  balanceDisplay: string;
  isLoaded: boolean;
}

const initialState: WalletState = {
  balanceCents:   0,
  balanceDisplay: '$0.00',
  isLoaded:       false,
};

/**
 * Wallet slice keeps the current balance in sync across the app.
 *
 * It is populated after a successful balance fetch and updated
 * optimistically after a deposit or when a settlement credit arrives
 * via WebSocket (Phase 3).
 *
 * Source of truth is always the API — this is a cache for display.
 */
const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setBalance(
      state,
      action: PayloadAction<{ balanceCents: number; balanceDisplay: string }>,
    ) {
      state.balanceCents   = action.payload.balanceCents;
      state.balanceDisplay = action.payload.balanceDisplay;
      state.isLoaded       = true;
    },

    clearBalance(state) {
      state.balanceCents   = 0;
      state.balanceDisplay = '$0.00';
      state.isLoaded       = false;
    },
  },
});

export const { setBalance, clearBalance } = walletSlice.actions;
export default walletSlice.reducer;
