import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type ConnectionState = 'connected' | 'disconnected';

interface UseSocketOptions {
  enabled?: boolean;
  onError?: () => void;
}

export function useSocketIO({
  enabled = true,
  onError
}: UseSocketOptions = {}) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) {
      console.log('WebSocket disabled');
      return;
    }

    console.log('🎧 Initializing socket connection...');

    const socket = io(window.location.origin, {
      path: '/trading-socket',
      transports: ['polling', 'websocket'],
      timeout: 60000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🟢 Connected to server');
      setConnectionState('connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('🔴 Disconnected from server:', reason);
      setConnectionState('disconnected');
    });

    socket.on('error', (error) => {
      console.error('❌ Error:', error);
      onError?.();
    });

    socket.on('connect_error', (error) => {
      console.log('⚠️ Connection error:', error.message);
    });

    return () => {
      console.log('🧹 Cleaning up connection');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, onError]);

  return {
    connectionState,
    socket: socketRef.current
  };
}