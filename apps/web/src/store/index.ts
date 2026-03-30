import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer   from './slices/AuthSlice';
import walletReducer from './slices/WalletSlice';
import uiReducer     from './slices/UiSlice';

export const store = configureStore({
  reducer: {
    auth:   authReducer,
    wallet: walletReducer,
    ui:     uiReducer,
  },
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore    = typeof store;

/** Typed hooks — use these everywhere instead of plain useDispatch/useSelector */
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
