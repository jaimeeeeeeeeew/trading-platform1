import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  enabled?: boolean;
  onData?: (data: any) => void;
  onError?: (error: any) => void;
}

export function useSocketIO({ enabled = true, onData, onError }: UseSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const socket = io('http://localhost:5050', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO conectado en puerto 5050');
      setIsConnected(true);
    });

    socket.on('marketData', (data) => {
      console.log('Datos de mercado recibidos:', data);
      onData?.(data);
    });

    socket.on('connect_error', (error) => {
      console.error('Error de conexión Socket.IO:', error);
      onError?.(error);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO desconectado');
      setIsConnected(false);
    });

    return () => {
      console.log('Limpiando conexión Socket.IO');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, onData, onError]);

  const sendData = (data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('localData', data);
    }
  };

  return {
    isConnected,
    sendData,
    socket: socketRef.current,
  };
}