import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;

  const startHeartbeat = (socket: Socket) => {
    stopHeartbeat();
    heartbeatInterval.current = setInterval(() => {
      if (socket.connected) {
        console.log('💓 Enviando heartbeat...');
        socket.emit('heartbeat');
      } else {
        console.log('❌ No se puede enviar heartbeat - Socket desconectado');
        socket.connect();
      }
    }, 10000); // Reduced to 10 seconds for more aggressive health check
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  };

  const clearReconnectTimeout = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
  };

  const requestInitialData = (socket: Socket) => {
    if (socket.connected) {
      console.log('📡 Solicitando datos iniciales...');
      socket.emit('request_orderbook');
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const socket = io(window.location.origin, {
      path: '/trading-socket',
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      transports: ['polling', 'websocket'], // Start with both transports
      timeout: 20000, // Reduced timeout
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      extraHeaders: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      const transport = socket.io.engine.transport.name;
      console.log(`🟢 Socket.IO conectado - ID: ${socket.id} Transport: ${transport}`);
      setIsConnected(true);
      reconnectAttempts.current = 0;
      clearReconnectTimeout();
      startHeartbeat(socket);
      requestInitialData(socket);
    });

    socket.io.engine.on('upgrade', () => {
      const transport = socket.io.engine.transport.name;
      console.log(`🔄 Transport upgraded to: ${transport}`);
    });

    socket.on('profile_data', (data: ProfileData[]) => {
      console.log('📊 Datos recibidos:', {
        timestamp: new Date().toISOString(),
        niveles: data.length,
        transport: socket.io.engine.transport.name
      });

      if (Array.isArray(data) && data.length > 0) {
        const validData = data.every(item =>
          typeof item.price === 'number' &&
          typeof item.volume === 'number' &&
          (item.side === 'bid' || item.side === 'ask') &&
          typeof item.total === 'number'
        );

        if (validData) {
          onProfileData?.(data);
        } else {
          console.error('❌ Datos inválidos recibidos');
          onError?.({ message: 'Datos inválidos' });
        }
      }
    });

    socket.on('heartbeat_ack', () => {
      console.log('💓 Heartbeat confirmado');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error.message);
      onError?.(error);

      if (reconnectAttempts.current < maxReconnectAttempts) {
        const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 5000);
        console.log(`🔄 Reintento en ${backoffTime}ms...`);

        clearReconnectTimeout();
        reconnectTimeout.current = setTimeout(() => {
          reconnectAttempts.current++;
          if (!socket.connected) {
            socket.connect();
          }
        }, backoffTime);
      }
    });

    socket.on('disconnect', (reason) => {
      const transport = socket.io.engine.transport?.name || 'unknown';
      console.log(`🔴 Desconectado - Razón: ${reason} Transport: ${transport}`);
      setIsConnected(false);
      stopHeartbeat();

      if (reason === 'transport close' || reason === 'ping timeout') {
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 5000);
          console.log(`🔄 Reintento en ${backoffTime}ms...`);

          clearReconnectTimeout();
          reconnectTimeout.current = setTimeout(() => {
            if (!socket.connected) {
              reconnectAttempts.current++;
              socket.connect();
            }
          }, backoffTime);
        }
      }
    });

    return () => {
      console.log('🧹 Limpiando conexión Socket.IO');
      stopHeartbeat();
      clearReconnectTimeout();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, onData, onProfileData, onError]);

  const sendData = (data: any) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      console.log('📤 Enviando datos:', {
        timestamp: new Date().toISOString(),
        transport: socket.io.engine.transport.name,
        connected: socket.connected,
        id: socket.id
      });
      socket.emit('orderbook_data', data);
    } else {
      console.warn('⚠️ No se pueden enviar datos - Socket desconectado');
      if (socket && !socket.connected && reconnectAttempts.current < maxReconnectAttempts) {
        socket.connect();
      }
    }
  };

  return {
    isConnected,
    sendData,
    socket: socketRef.current,
  };
}