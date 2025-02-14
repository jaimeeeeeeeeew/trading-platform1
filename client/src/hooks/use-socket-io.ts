import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'error';

interface UseSocketOptions {
  enabled?: boolean;
  onError?: () => void;
  onProfileData?: (data: Array<{ price: number; volume: number; side: 'bid' | 'ask' }>) => void;
  onPriceUpdate?: (price: number) => void;
}

export function useSocketIO({
  enabled = true,
  onError,
  onProfileData,
  onPriceUpdate
}: UseSocketOptions = {}) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5; // Reducido de 10 a 5 intentos
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageBufferRef = useRef<any[]>([]);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const lastUpdateTimeRef = useRef<number>(0);
  const updateThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true); // Para evitar actualizaciones en componentes desmontados

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      console.log('WebSocket disabled');
      return;
    }

    const cleanup = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (updateThrottleRef.current) {
        clearTimeout(updateThrottleRef.current);
        updateThrottleRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
      }
      messageBufferRef.current = [];
    };

    const processBufferedMessages = () => {
      const maxBufferSize = 50; // Reducido de 100 a 50
      if (messageBufferRef.current.length > maxBufferSize) {
        messageBufferRef.current = messageBufferRef.current.slice(-maxBufferSize);
      }

      if (messageBufferRef.current.length > 0) {
        console.log('Processing buffered messages:', messageBufferRef.current.length);
        while (messageBufferRef.current.length > 0) {
          const msg = messageBufferRef.current.shift();
          if (msg && socketRef.current?.connected) {
            socketRef.current.emit(msg.type, msg.data);
          }
        }
      }
    };

    const initializeSocket = () => {
      if (!mountedRef.current) return;

      console.log('🎧 Initializing socket connection...');
      setConnectionState('connecting');

      cleanup();

      const socket = io(window.location.origin, {
        path: '/trading-socket',
        transports: ['websocket'],
        timeout: 20000, // Reducido de 60000 a 20000
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000, // Reducido de 2000 a 1000
        reconnectionDelayMax: 5000, // Reducido de 10000 a 5000
        randomizationFactor: 0.3, // Reducido de 0.5 a 0.3
        autoConnect: true,
        forceNew: true
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        if (!mountedRef.current) return;
        console.log('🟢 Connected to server');
        setConnectionState('connected');
        reconnectAttempts.current = 0;
        setIsReconnecting(false);
        processBufferedMessages();
      });

      socket.on('disconnect', (reason) => {
        if (!mountedRef.current) return;
        console.log('🔴 Disconnected from server:', reason);
        setConnectionState('disconnected');

        if (reason === 'io server disconnect' || reason === 'transport close') {
          setIsReconnecting(true);
          handleError();
        }
      });

      const throttleUpdate = (callback: () => void) => {
        const now = Date.now();
        if (now - lastUpdateTimeRef.current < 150) { // Aumentado de 100ms a 150ms
          if (updateThrottleRef.current) {
            clearTimeout(updateThrottleRef.current);
          }
          updateThrottleRef.current = setTimeout(callback, 150);
          return;
        }
        lastUpdateTimeRef.current = now;
        callback();
      };

      socket.on('orderbook_update', (data) => {
        if (!mountedRef.current) return;
        try {
          throttleUpdate(() => {
            if (isReconnecting) {
              if (messageBufferRef.current.length < 50) { // Limite del buffer
                messageBufferRef.current.push({ type: 'orderbook_update', data });
              }
              return;
            }

            if (onProfileData) {
              const bids = data.bids.map((bid: any) => ({
                price: parseFloat(bid.Price),
                volume: parseFloat(bid.Quantity),
                side: 'bid' as const
              }));

              const asks = data.asks.map((ask: any) => ({
                price: parseFloat(ask.Price),
                volume: parseFloat(ask.Quantity),
                side: 'ask' as const
              }));

              const midPrice = (parseFloat(data.bids[0]?.Price || '0') + parseFloat(data.asks[0]?.Price || '0')) / 2;
              if (midPrice && onPriceUpdate) {
                onPriceUpdate(midPrice);
              }

              onProfileData([...bids, ...asks]);
            }
          });
        } catch (error) {
          console.error('Error processing orderbook update:', error);
        }
      });

      socket.on('error', (error) => {
        if (!mountedRef.current) return;
        console.error('❌ Socket Error:', error);
        handleError();
      });

      socket.on('connect_error', (error) => {
        if (!mountedRef.current) return;
        console.log('⚠️ Connection error:', error.message);
        handleError();
      });

      socket.on('reconnect_attempt', (attempt) => {
        if (!mountedRef.current) return;
        console.log(`🔄 Reconnection attempt ${attempt}/${maxReconnectAttempts}`);
        setIsReconnecting(true);
      });

      socket.on('reconnect', (attempt) => {
        if (!mountedRef.current) return;
        console.log(`🔄 Reconnected after ${attempt} attempts`);
        setIsReconnecting(false);
        processBufferedMessages();
      });

      socket.on('reconnect_failed', () => {
        if (!mountedRef.current) return;
        console.log('❌ Failed to reconnect after all attempts');
        setIsReconnecting(false);
        messageBufferRef.current = [];
        onError?.();
      });
    };

    const handleError = () => {
      if (!mountedRef.current) return;

      reconnectAttempts.current++;

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.log('🔄 Max reconnection attempts reached, stopping...');
        cleanup();
        setConnectionState('error');
        setIsReconnecting(false);
        onError?.();
      } else {
        console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
        setConnectionState('connecting');
        setIsReconnecting(true);

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts.current - 1), 5000);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            initializeSocket();
          }
        }, delay);
      }
    };

    initializeSocket();

    return cleanup;
  }, [enabled, onError, onProfileData, onPriceUpdate]);

  const reconnect = () => {
    if (!mountedRef.current) return;

    reconnectAttempts.current = 0;
    setIsReconnecting(false);
    if (socketRef.current) {
      console.log('🔄 Forcing reconnection...');
      socketRef.current.connect();
    }
  };

  return {
    connectionState,
    socket: socketRef.current,
    reconnect,
    isReconnecting
  };
}