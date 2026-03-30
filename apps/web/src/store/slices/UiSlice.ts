import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface UiState {
  toasts: Toast[];
}

const initialState: UiState = {
  toasts: [],
};

/**
 * UI slice owns ephemeral interface state that doesn't belong in a Context
 * (because multiple unrelated components need to dispatch toasts).
 *
 * Toast flow:
 *  1. Any component or thunk dispatches addToast(...)
 *  2. ToastContainer reads toasts from store and renders them
 *  3. Each toast auto-removes itself after a timeout via removeToast(id)
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addToast(state, action: PayloadAction<Omit<Toast, 'id'>>) {
      state.toasts.push({
        id:      crypto.randomUUID(),
        message: action.payload.message,
        variant: action.payload.variant,
      });
    },

    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { addToast, removeToast } = uiSlice.actions;
export default uiSlice.reducer;
