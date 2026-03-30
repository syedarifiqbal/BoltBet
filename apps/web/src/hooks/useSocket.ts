'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from '@/store';
import { useToast } from '@/context/ToastContext';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { formatCents } from '@/lib/utils';

interface BetSettledEvent {
  betId:       string;
  marketName:  string;
  result:      'WIN' | 'LOSS';
  payoutCents: number;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Connects to the Socket.io server and listens for real-time events.
 *
 * - Connects when the user is authenticated (has an access token in memory).
 * - Sends the access token in handshake.auth.token — never in a cookie or URL.
 * - Disconnects on logout (token becomes null).
 * - On `bet:settled`: shows a toast and invalidates wallet + bets queries so
 *   the UI refreshes automatically.
 */
export function useSocket(): void {
  const token    = useAppSelector((s) => s.auth.accessToken);
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // No token = not authenticated. Disconnect if we have a stale socket.
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Already connected (e.g. StrictMode double-invoke) — skip.
    if (socketRef.current?.connected) return;

    const socket = io(SOCKET_URL, {
      // Access token sent in handshake — server validates RS256 + blacklist.
      // Never sent in a query param or URL (visible in logs).
      auth:             { token },
      transports:       ['websocket'],
      reconnection:     true,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.debug('[socket] connected', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.debug('[socket] disconnected', reason);
    });

    socket.on('connect_error', (err) => {
      console.debug('[socket] connection error', err.message);
    });

    // ── bet:settled ────────────────────────────────────────────────────────
    // Fired by the server when a market this user had a bet on is settled.
    socket.on('bet:settled', (payload: BetSettledEvent) => {
      if (payload.result === 'WIN') {
        toast.success(
          `You won! "${payload.marketName}" settled. Payout: ${formatCents(payload.payoutCents)}`,
        );
      } else {
        toast.info(
          `"${payload.marketName}" settled. Better luck next time.`,
        );
      }

      // Refresh wallet balance and bets list so the UI reflects the new state.
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bets.list(1) });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]); // reconnect whenever the token changes (login/logout)
}
