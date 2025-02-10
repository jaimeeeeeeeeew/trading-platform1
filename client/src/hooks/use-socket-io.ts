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
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  const startHeartbeat = (socket: Socket) => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }
    heartbeatInterval.current = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
      }
    }, 20000);
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
    if (!enabled) return;

    const socket = io(window.location.origin, {
      path: '/trading-socket',
      transports: ['polling'],
      timeout: 60000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🟢 Conectado al servidor');
      setIsConnected(true);
      startHeartbeat(socket);
      requestInitialData(socket);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔴 Desconectado del servidor:', reason);
      setIsConnected(false);
      stopHeartbeat();
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

    return () => {
      console.log('🧹 Limpiando conexión');
      stopHeartbeat();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, onData, onProfileData, onError]);

  const sendData = (data: any) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      console.log('📤 Enviando datos al servidor');
      socket.emit('orderbook_data', data);
    } else {
      console.warn('⚠️ No se pueden enviar datos - Socket desconectado');
    }
  };

  return {
    isConnected,
    sendData,
    socket: socketRef.current
  };
}