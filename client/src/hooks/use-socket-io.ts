import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type ConnectionState = 'listening' | 'connected' | 'disconnected';

interface UseSocketOptions {
  enabled?: boolean;
  onData?: (data: any) => void;
  onProfileData?: (data: ProfileData[]) => void;
  onError?: (error: any) => void;
}

interface ProfileData {
  price: number;
  volume: number;
  side: 'bid' | 'ask';
  total: number;
}

export function useSocketIO({
  enabled = true,
  onData,
  onProfileData,
  onError
}: UseSocketOptions = {}) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const maxReconnectAttempts = 5;

  const clearReconnectTimeout = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
  };

  const startHeartbeat = (socket: Socket) => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }
    heartbeatInterval.current = setInterval(() => {
      if (socket.connected) {
        console.log('📤 Enviando heartbeat');
        socket.emit('heartbeat');
      }
    }, 30000);
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  };

  const requestInitialData = (socket: Socket) => {
    if (socket.connected) {
      console.log('📡 Solicitando datos iniciales...');
      socket.emit('request_orderbook');
    }
  };

  useEffect(() => {
    if (!enabled) {
      console.log('WebSocket deshabilitado');
      return;
    }

    console.log('🎧 Iniciando escucha de conexiones...');

    const socket = io(window.location.origin, {
      path: '/trading-socket',
      transports: ['websocket', 'polling'],
      timeout: 60000,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      autoConnect: true,
      forceNew: true,
      upgrade: true,
      rememberUpgrade: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🟢 Conectado al servidor');
      setConnectionState('connected');
      reconnectAttempts.current = 0;
      clearReconnectTimeout();
      startHeartbeat(socket);
      requestInitialData(socket);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔴 Desconectado del servidor:', reason);
      setConnectionState('disconnected');
      stopHeartbeat();

      if (reason === 'io server disconnect' || reason === 'transport close') {
        clearReconnectTimeout();
        reconnectTimeout.current = setTimeout(() => {
          if (reconnectAttempts.current < maxReconnectAttempts) {
            console.log(`🔄 Intento de reconexión ${reconnectAttempts.current + 1}/${maxReconnectAttempts}`);
            reconnectAttempts.current++;
            socket.connect();
          } else {
            console.log('❌ Máximo de intentos de reconexión alcanzado');
            onError?.();
          }
        }, Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000));
      }
    });

    socket.on('profile_data', (data: ProfileData[]) => {
      if (Array.isArray(data) && data.length > 0) {
        console.log('📊 Datos recibidos del servidor');
        onProfileData?.(data);
      }
    });

    socket.on('error', (error) => {
      console.error('❌ Error:', error);
      onError?.(error);
    });

    socket.on('connect_error', (error) => {
      console.log('⚠️ Error de conexión:', error.message);

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.log('❌ Máximo de intentos de reconexión alcanzado');
        socket.disconnect();
        onError?.(error);
      }
    });

    socket.on('heartbeat_ack', () => {
      console.log('💓 Heartbeat confirmado por el servidor');
    });

    return () => {
      console.log('🧹 Limpiando conexión');
      clearReconnectTimeout();
      stopHeartbeat();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, onData, onProfileData, onError]);

  return {
    connectionState,
    socket: socketRef.current
  };
}